'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  incidentIntakeSchema,
  incidentTriageSchema,
  incidentCloseSchema,
  type IncidentIntakeInput,
  type IncidentTriageInput,
  type IncidentCloseInput,
} from '@/lib/schemas/incidents'
import { isValidIncidentStatusTransition, calculateIncidentSlaDueDate } from '@/lib/incidents/incident-utils'
import type { AppRole } from '@/types/auth'
import type { IncidentStatus } from '@/types/incidents'

const uuidSchema = z.string().uuid()

const GENERIC_ERROR = 'An unexpected error occurred. If this persists, contact your administrator.'

// Roles allowed to perform triage, assignment, and status updates (oversight / compliance roles)
const OVERSIGHT_ROLES: AppRole[] = ['admin', 'compliance-officer']

type ActionResult = { error: string } | { data: { id: string; case_reference?: string } }

/**
 * Get authenticated user with role and institution context.
 */
async function getWriteContext(allowedRoles: AppRole[] = OVERSIGHT_ROLES) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized.' as const }
  }

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role
  const institutionId = appMeta?.institution_id

  if (!activeRole || !allowedRoles.includes(activeRole as AppRole)) {
    return { error: 'You do not have permission to perform this action.' as const }
  }

  if (!institutionId) {
    return { error: 'Institution context is missing from your token.' as const }
  }

  return { supabase, user, institutionId, activeRole }
}

function revalidateIncidentPaths(caseId?: string) {
  revalidatePath('/incidents')
  revalidatePath('/incidents/cases')
  revalidatePath('/incidents/report')
  if (caseId) {
    revalidatePath(`/incidents/cases/${caseId}`)
  }
}

/**
 * Public or Authenticated Incident Intake.
 * Strips reporter identity when `is_anonymous` is true.
 */
export async function createIncidentCase(
  values: IncidentIntakeInput & { institution_id?: string }
): Promise<ActionResult> {
  const parsed = incidentIntakeSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const isAnonymous = parsed.data.is_anonymous
  let instId = values.institution_id

  // If user is authenticated, we default to their institutional ID
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const appMeta = user.app_metadata as Record<string, string>
    if (appMeta?.institution_id) {
      instId = appMeta.institution_id
    }
  }

  if (!instId) {
    return { error: 'Institution context is required to submit a report.' }
  }

  try {
    const adminClient = createAdminClient()

    // Determine initial SLA based on default 'low' severity (triaged severity can escalate this)
    const slaDueDate = calculateIncidentSlaDueDate(new Date(), 'low').toISOString()
    const reporterName = isAnonymous ? null : (parsed.data.reporter_name?.trim() || null)
    const reporterContact = isAnonymous ? null : (parsed.data.reporter_contact?.trim() || null)

    // Strip reporter identity if anonymous (absolute confidentiality compliance)
    const insertPayload = {
      institution_id: instId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      is_anonymous: isAnonymous,
      reported_by_user_id: isAnonymous ? null : (user?.id ?? null),
      reporter_name: reporterName,
      reporter_contact: reporterContact,
      severity: 'low' as const,
      status: 'new' as const,
      visibility: 'investigator_admin_only' as const,
      sla_due_date: slaDueDate,
    }

    const { data: newCase, error: insertError } = await adminClient
      .from('incident_cases')
      .insert(insertPayload)
      .select('id, case_reference')
      .single()

    if (insertError) {
      console.error('[createIncidentCase] DB error:', insertError)
      return { error: GENERIC_ERROR }
    }

    const caseId = (newCase as { id: string }).id
    const caseReference = (newCase as { case_reference?: string }).case_reference

    // Insert Intake Event in chronology
    await adminClient.from('incident_case_events').insert({
      institution_id: instId,
      case_id: caseId,
      event_type: 'intake',
      notes: isAnonymous
        ? 'Anonymous incident report received.'
        : `Incident report received from ${reporterName || 'Named Submitter'}.`,
      actor_id: isAnonymous ? null : (user?.id ?? null),
      actor_name: isAnonymous ? null : (user?.email || reporterName || 'Guest User'),
    })

    revalidateIncidentPaths(caseId)

    return { data: { id: caseId, case_reference: caseReference } }
  } catch (err) {
    console.error('[createIncidentCase] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

/**
 * Assign or Reassign an Investigator to a Case.
 * Requires admin or compliance-officer.
 */
export async function assignIncidentInvestigator(
  caseId: string,
  values: IncidentTriageInput
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(caseId).success) {
    return { error: 'Invalid case ID.' }
  }

  const parsed = incidentTriageSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const context = await getWriteContext(OVERSIGHT_ROLES)
  if ('error' in context) return { error: context.error ?? GENERIC_ERROR }

  try {
    const adminClient = createAdminClient()

    // 1. Get the current state of the case
    const { data: currentCase, error: readError } = await adminClient
      .from('incident_cases')
      .select('assigned_investigator_id, status, severity')
      .eq('id', caseId)
      .eq('institution_id', context.institutionId)
      .single()

    if (readError || !currentCase) {
      console.error('[assignIncidentInvestigator] Read error:', readError)
      return { error: 'Case not found.' }
    }

    const currentInvestigator = (currentCase as { assigned_investigator_id: string | null }).assigned_investigator_id
    const currentStatus = (currentCase as { status: IncidentStatus }).status
    const isReassignment = currentInvestigator !== null

    // Enforce status transitions: if status was new, it transitions to assigned
    let nextStatus = currentStatus
    if (currentStatus === 'new') {
      nextStatus = 'assigned'
    }

    // Enforce allowed status progression
    if (!isValidIncidentStatusTransition(currentStatus, nextStatus)) {
      return { error: `Invalid status transition from ${currentStatus} to ${nextStatus}.` }
    }

    // Recalculate SLA due date if severity has changed
    let slaDueDate = undefined
    if (parsed.data.severity !== (currentCase as { severity: string }).severity) {
      slaDueDate = calculateIncidentSlaDueDate(new Date(), parsed.data.severity).toISOString()
    }

    // 2. Perform the update
    const updatePayload: Record<string, any> = {
      assigned_investigator_id: parsed.data.assigned_investigator_id,
      severity: parsed.data.severity,
      visibility: parsed.data.visibility,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }
    if (slaDueDate) {
      updatePayload.sla_due_date = slaDueDate
    }

    const { error: updateError } = await adminClient
      .from('incident_cases')
      .update(updatePayload)
      .eq('id', caseId)
      .eq('institution_id', context.institutionId)

    if (updateError) {
      console.error('[assignIncidentInvestigator] Update error:', updateError)
      return { error: GENERIC_ERROR }
    }

    // 3. Log event
    const eventType = isReassignment ? 'reassignment' : 'assignment'
    const eventNotes = isReassignment
      ? `Case reassigned. Severity: ${parsed.data.severity}. Visibility: ${parsed.data.visibility}.${parsed.data.notes ? ` Notes: ${parsed.data.notes}` : ''}`
      : `Case triaged and investigator assigned. Severity: ${parsed.data.severity}. Visibility: ${parsed.data.visibility}.${parsed.data.notes ? ` Notes: ${parsed.data.notes}` : ''}`

    await adminClient.from('incident_case_events').insert({
      institution_id: context.institutionId,
      case_id: caseId,
      event_type: eventType,
      notes: eventNotes,
      actor_id: context.user.id,
      actor_name: context.user.email,
    })

    revalidateIncidentPaths(caseId)

    return { data: { id: caseId } }
  } catch (err) {
    console.error('[assignIncidentInvestigator] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

/**
 * Update case status.
 * Requires admin, compliance-officer, or the assigned investigator.
 */
export async function updateIncidentStatus(
  caseId: string,
  nextStatus: IncidentStatus,
  notes?: string
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(caseId).success) {
    return { error: 'Invalid case ID.' }
  }

  // Prevent closing via this action (must use closeIncidentCase)
  if (nextStatus === 'closed') {
    return { error: 'Case closure requires a resolution summary.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role
  const institutionId = appMeta?.institution_id

  if (!institutionId) return { error: 'Institution context missing.' }

  try {
    const adminClient = createAdminClient()

    // 1. Get current case details
    const { data: currentCase, error: readError } = await adminClient
      .from('incident_cases')
      .select('status, assigned_investigator_id')
      .eq('id', caseId)
      .eq('institution_id', institutionId)
      .single()

    if (readError || !currentCase) {
      return { error: 'Case not found.' }
    }

    const currentStatus = (currentCase as { status: IncidentStatus }).status
    const assignedInvestigator = (currentCase as { assigned_investigator_id: string | null }).assigned_investigator_id

    // Check authority: must be admin/compliance-officer or the assigned investigator
    const isInvestigator = assignedInvestigator === user.id
    const isOversight = activeRole && OVERSIGHT_ROLES.includes(activeRole as AppRole)

    if (!isInvestigator && !isOversight) {
      return { error: 'You do not have permission to update the status of this case.' }
    }

    // 2. Validate transition
    if (!isValidIncidentStatusTransition(currentStatus, nextStatus)) {
      return { error: `Invalid status transition from ${currentStatus} to ${nextStatus}.` }
    }

    // 3. Update status
    const { error: updateError } = await adminClient
      .from('incident_cases')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .eq('institution_id', institutionId)

    if (updateError) {
      console.error('[updateIncidentStatus] DB error:', updateError)
      return { error: GENERIC_ERROR }
    }

    // 4. Log status change event
    await adminClient.from('incident_case_events').insert({
      institution_id: institutionId,
      case_id: caseId,
      event_type: 'status_change',
      notes: `Status changed from ${currentStatus} to ${nextStatus}.${notes ? ` Notes: ${notes}` : ''}`,
      actor_id: user.id,
      actor_name: user.email,
    })

    revalidateIncidentPaths(caseId)

    return { data: { id: caseId } }
  } catch (err) {
    console.error('[updateIncidentStatus] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

/**
 * Close an Incident Case with a required Resolution Summary.
 * Requires admin, compliance-officer, or the assigned investigator.
 */
export async function closeIncidentCase(
  caseId: string,
  values: IncidentCloseInput
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(caseId).success) {
    return { error: 'Invalid case ID.' }
  }

  const parsed = incidentCloseSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role
  const institutionId = appMeta?.institution_id

  if (!institutionId) return { error: 'Institution context missing.' }

  try {
    const adminClient = createAdminClient()

    // 1. Get current case details
    const { data: currentCase, error: readError } = await adminClient
      .from('incident_cases')
      .select('status, assigned_investigator_id')
      .eq('id', caseId)
      .eq('institution_id', institutionId)
      .single()

    if (readError || !currentCase) {
      return { error: 'Case not found.' }
    }

    const currentStatus = (currentCase as { status: IncidentStatus }).status
    const assignedInvestigator = (currentCase as { assigned_investigator_id: string | null }).assigned_investigator_id

    // Check authority: must be admin/compliance-officer or the assigned investigator
    const isInvestigator = assignedInvestigator === user.id
    const isOversight = activeRole && OVERSIGHT_ROLES.includes(activeRole as AppRole)

    if (!isInvestigator && !isOversight) {
      return { error: 'You do not have permission to close this case.' }
    }

    // 2. Validate transition
    if (!isValidIncidentStatusTransition(currentStatus, 'closed')) {
      return { error: `Invalid status transition from ${currentStatus} to closed.` }
    }

    // 3. Update case details to closed
    const { error: updateError } = await adminClient
      .from('incident_cases')
      .update({
        status: 'closed',
        resolution_summary: parsed.data.resolution_summary,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .eq('institution_id', institutionId)

    if (updateError) {
      console.error('[closeIncidentCase] Update error:', updateError)
      return { error: GENERIC_ERROR }
    }

    // 4. Log closure event
    await adminClient.from('incident_case_events').insert({
      institution_id: institutionId,
      case_id: caseId,
      event_type: 'closure',
      notes: `Case closed with resolution summary: "${parsed.data.resolution_summary}"`,
      actor_id: user.id,
      actor_name: user.email,
    })

    revalidateIncidentPaths(caseId)

    return { data: { id: caseId } }
  } catch (err) {
    console.error('[closeIncidentCase] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
