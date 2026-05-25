'use server'
// lib/audit/universe-actions.ts
// Server Actions for Phase 10 Audit Universe.
// SECURITY: Zod safeParse before any DB write.
// SECURITY: Roles checked via user.app_metadata JWT claim.
// SECURITY: institution_id sourced ONLY from user.app_metadata.institution_id.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  auditPlanSchema,
  auditPlanStatusSchema,
  auditEngagementSchema,
  auditEngagementStatusSchema,
  auditTestProcedureSchema,
  auditTestProcedureResultSchema,
  auditWorkpaperSchema,
  type AuditPlanInput,
  type AuditPlanStatusInput,
  type AuditEngagementInput,
  type AuditEngagementStatusInput,
  type AuditTestProcedureInput,
  type AuditTestProcedureResultInput,
  type AuditWorkpaperInput,
} from '@/lib/schemas/audit-universe'

const uuidSchema     = z.string().uuid()
const GENERIC_ERROR  = 'An unexpected error occurred. If this persists, contact your administrator.'
const WRITE_ROLES    = ['admin', 'audit-officer'] as const

type WriteRole = typeof WRITE_ROLES[number]

type ActionResult = { error: string } | { data: { id: string } }

type CtxError = { error: 'Unauthorized.' | 'Missing token claims.' }
type CtxOk = { supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string }; activeRole: string; institutionId: string }

async function getCtx(): Promise<CtxError | CtxOk> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' as const }

  const appMeta       = user.app_metadata as Record<string, string>
  const activeRole    = appMeta?.active_role as string | undefined
  const institutionId = appMeta?.institution_id as string | undefined

  if (!activeRole || !institutionId) return { error: 'Missing token claims.' as const }
  return { supabase, user: user as { id: string }, activeRole, institutionId }
}

// ─── Audit Plans ─────────────────────────────────────────────────────────────

export async function createAuditPlan(values: AuditPlanInput): Promise<ActionResult> {
  const parsed = auditPlanSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to create audit plans.' }
  }

  try {
    const { data, error } = await ctx.supabase
      .from('audit_plans')
      .insert({
        ...parsed.data,
        institution_id: ctx.institutionId,
        created_by:     ctx.user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createAuditPlan] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/audit/plans')
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createAuditPlan] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

export async function updateAuditPlanStatus(
  planId: string,
  values: AuditPlanStatusInput,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(planId).success) return { error: 'Invalid plan ID.' }
  const parsed = auditPlanStatusSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to update this plan.' }
  }

  try {
    const payload: Record<string, unknown> = {
      status:     parsed.data.status,
      updated_at: new Date().toISOString(),
    }
    if (parsed.data.status === 'approved') {
      payload.approved_by = ctx.user.id
      payload.approved_at = new Date().toISOString()
    }

    const { data, error } = await ctx.supabase
      .from('audit_plans')
      .update(payload)
      .eq('id', planId)
      .eq('institution_id', ctx.institutionId)
      .select('id')
      .single()

    if (error) {
      console.error('[updateAuditPlanStatus] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/audit/plans')
    revalidatePath(`/audit/plans/${planId}`)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[updateAuditPlanStatus] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── Audit Engagements ───────────────────────────────────────────────────────

export async function createAuditEngagement(
  planId: string,
  values: AuditEngagementInput,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(planId).success) return { error: 'Invalid plan ID.' }
  const parsed = auditEngagementSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to create engagements.' }
  }

  try {
    const { data, error } = await ctx.supabase
      .from('audit_engagements')
      .insert({
        plan_id:         planId,
        institution_id:  ctx.institutionId,
        title:           parsed.data.title,
        description:     parsed.data.description || null,
        auditee_dept:    parsed.data.auditee_dept || null,
        lead_auditor_id: parsed.data.lead_auditor_id ?? null,
        planned_start:   parsed.data.planned_start,
        planned_end:     parsed.data.planned_end,
        created_by:      ctx.user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createAuditEngagement] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath(`/audit/plans/${planId}`)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createAuditEngagement] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

export async function updateAuditEngagementStatus(
  engagementId: string,
  values: AuditEngagementStatusInput,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(engagementId).success) return { error: 'Invalid engagement ID.' }
  const parsed = auditEngagementStatusSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  try {
    const { data, error } = await ctx.supabase
      .from('audit_engagements')
      .update({
        status:       parsed.data.status,
        opinion:      parsed.data.opinion || null,
        actual_start: parsed.data.actual_start ?? null,
        actual_end:   parsed.data.actual_end ?? null,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', engagementId)
      .eq('institution_id', ctx.institutionId)
      .select('id, plan_id')
      .single()

    if (error) {
      console.error('[updateAuditEngagementStatus] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    const planId = (data as { id: string; plan_id: string }).plan_id
    revalidatePath(`/audit/plans/${planId}`)
    revalidatePath(`/audit/plans/${planId}/engagements/${engagementId}`)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[updateAuditEngagementStatus] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── Test Procedures ─────────────────────────────────────────────────────────

export async function createAuditTestProcedure(
  engagementId: string,
  values: AuditTestProcedureInput,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(engagementId).success) return { error: 'Invalid engagement ID.' }
  const parsed = auditTestProcedureSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to add test procedures.' }
  }

  try {
    const { data, error } = await ctx.supabase
      .from('audit_test_procedures')
      .insert({
        engagement_id:  engagementId,
        institution_id: ctx.institutionId,
        step_number:    parsed.data.step_number,
        objective:      parsed.data.objective,
        procedure_text: parsed.data.procedure_text,
        notes:          parsed.data.notes || null,
      })
      .select('id')
      .single()

    if (error) {
      // Unique constraint on (engagement_id, step_number)
      if (error.code === '23505') {
        return { error: `Step number ${parsed.data.step_number} already exists for this engagement.` }
      }
      console.error('[createAuditTestProcedure] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath(`/audit/plans`)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createAuditTestProcedure] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

export async function updateTestProcedureResult(
  procedureId: string,
  values: AuditTestProcedureResultInput,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(procedureId).success) return { error: 'Invalid procedure ID.' }
  const parsed = auditTestProcedureResultSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  try {
    const { data, error } = await ctx.supabase
      .from('audit_test_procedures')
      .update({
        result:       parsed.data.result,
        notes:        parsed.data.notes || null,
        performed_by: ctx.user.id,
        performed_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq('id', procedureId)
      .eq('institution_id', ctx.institutionId)
      .select('id')
      .single()

    if (error) {
      console.error('[updateTestProcedureResult] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/audit/plans')
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[updateTestProcedureResult] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── Workpapers ──────────────────────────────────────────────────────────────

export async function createAuditWorkpaper(
  engagementId: string,
  values: AuditWorkpaperInput,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(engagementId).success) return { error: 'Invalid engagement ID.' }
  const parsed = auditWorkpaperSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to create workpapers.' }
  }

  try {
    const { data, error } = await ctx.supabase
      .from('audit_workpapers')
      .insert({
        engagement_id:    engagementId,
        institution_id:   ctx.institutionId,
        title:            parsed.data.title,
        description:      parsed.data.description || null,
        reference_number: parsed.data.reference_number || null,
        created_by:       ctx.user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createAuditWorkpaper] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/audit/plans')
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createAuditWorkpaper] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
