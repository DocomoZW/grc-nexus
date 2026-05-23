'use server'
// lib/strategic/actions.ts
// Server Actions for all Strategic Planning CRUD operations.
// SECURITY: Zod safeParse before any DB call — strips unknown fields.
// SECURITY: Role checked via user.app_metadata (JWT claim) — not DB query.
// SECURITY: institutionId sourced ONLY from user.app_metadata.institution_id (JWT claim).
// SECURITY: Generic error messages returned to client; internal details only in console.error.
// SECURITY: redirect() is NEVER called inside try/catch blocks.
// PATTERN: Follows lib/auth/actions.ts exactly — getUser() not getSession().

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  objectiveSchema,
  kpiSchema,
  kpiReadingSchema,
  type ObjectiveInput,
  type KpiInput,
  type KpiReadingInput,
} from '@/lib/schemas/strategic'
import type { ObjectiveStatus } from '@/types/strategic'

// ─── Role Sets ────────────────────────────────────────────────────────────────
const OBJECTIVE_ROLES = ['admin', 'ceo'] as const
const KPI_ROLES       = ['admin', 'ceo', 'risk-officer'] as const

// ─── Valid ObjectiveStatus values ────────────────────────────────────────────
const VALID_OBJECTIVE_STATUSES: ObjectiveStatus[] = ['draft', 'active', 'at_risk', 'completed', 'cancelled']

// ─── Generic Error ────────────────────────────────────────────────────────────
const GENERIC_ERROR = 'An unexpected error occurred. If this persists, contact your administrator.'

// ─── createObjective ─────────────────────────────────────────────────────────
/**
 * Create a new strategic objective.
 * Allowed roles: admin, ceo.
 * institution_id sourced from JWT claim — never from client.
 */
export async function createObjective(
  values: ObjectiveInput,
): Promise<{ error: string } | { data: { id: string } }> {
  // 1. Zod validation (strips unknown fields, enforces types)
  const parsed = objectiveSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    // 2. Authenticate — getUser() not getSession() (RESEARCH.md Pitfall 1)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    // 3. Role check via JWT claims (T-02-P03-01, T-02-P03-04)
    const appMeta      = user.app_metadata as Record<string, string>
    const activeRole   = appMeta?.active_role
    const institutionId = appMeta?.institution_id

    if (!OBJECTIVE_ROLES.includes(activeRole as typeof OBJECTIVE_ROLES[number])) {
      return { error: 'You do not have permission to create objectives.' }
    }

    // 4. Insert — only parsed.data reaches DB (T-02-P03-03 mass-assignment protection)
    const { data, error } = await supabase
      .from('strategic_objectives')
      .insert({
        ...parsed.data,
        institution_id: institutionId,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createObjective] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    // 5. Revalidate relevant pages
    revalidatePath('/strategic/objectives')
    revalidatePath('/strategic')

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createObjective] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── updateObjective ─────────────────────────────────────────────────────────
/**
 * Update an existing strategic objective.
 * Allowed roles: admin, ceo.
 */
export async function updateObjective(
  id: string,
  values: ObjectiveInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = objectiveSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta    = user.app_metadata as Record<string, string>
    const activeRole = appMeta?.active_role

    if (!OBJECTIVE_ROLES.includes(activeRole as typeof OBJECTIVE_ROLES[number])) {
      return { error: 'You do not have permission to update objectives.' }
    }

    const { data, error } = await supabase
      .from('strategic_objectives')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .single()

    if (error) {
      console.error('[updateObjective] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/strategic/objectives')
    revalidatePath(`/strategic/objectives/${id}`)

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[updateObjective] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── updateObjectiveStatus ───────────────────────────────────────────────────
/**
 * Update the status field of an objective.
 * Allowed roles: admin, ceo.
 */
export async function updateObjectiveStatus(
  id: string,
  status: ObjectiveStatus,
): Promise<{ error: string } | { data: { id: string } }> {
  // Validate status is a known ObjectiveStatus value
  if (!VALID_OBJECTIVE_STATUSES.includes(status)) {
    return { error: 'Invalid status value.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta    = user.app_metadata as Record<string, string>
    const activeRole = appMeta?.active_role

    if (!OBJECTIVE_ROLES.includes(activeRole as typeof OBJECTIVE_ROLES[number])) {
      return { error: 'You do not have permission to update objective status.' }
    }

    const { data, error } = await supabase
      .from('strategic_objectives')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .single()

    if (error) {
      console.error('[updateObjectiveStatus] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/strategic/objectives')
    revalidatePath(`/strategic/objectives/${id}`)

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[updateObjectiveStatus] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── createKpi ───────────────────────────────────────────────────────────────
/**
 * Create a new KPI linked to a strategic objective.
 * Allowed roles: admin, ceo, risk-officer.
 */
export async function createKpi(
  values: KpiInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kpiSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta       = user.app_metadata as Record<string, string>
    const activeRole    = appMeta?.active_role
    const institutionId = appMeta?.institution_id

    if (!KPI_ROLES.includes(activeRole as typeof KPI_ROLES[number])) {
      return { error: 'You do not have permission to create KPIs.' }
    }

    const { data, error } = await supabase
      .from('kpis')
      .insert({
        ...parsed.data,
        institution_id: institutionId,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createKpi] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    // Revalidate the parent objective's detail page and the strategic overview
    revalidatePath(`/strategic/objectives/${parsed.data.objective_id}`)
    revalidatePath('/strategic')

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createKpi] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── updateKpi ───────────────────────────────────────────────────────────────
/**
 * Update an existing KPI.
 * Allowed roles: admin, ceo, risk-officer.
 */
export async function updateKpi(
  id: string,
  values: KpiInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kpiSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta    = user.app_metadata as Record<string, string>
    const activeRole = appMeta?.active_role

    if (!KPI_ROLES.includes(activeRole as typeof KPI_ROLES[number])) {
      return { error: 'You do not have permission to update KPIs.' }
    }

    const { data, error } = await supabase
      .from('kpis')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .single()

    if (error) {
      console.error('[updateKpi] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[updateKpi] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── recordKpiReading ────────────────────────────────────────────────────────
/**
 * Record a period reading for a KPI.
 * Allowed: KPI owner_id === user.id OR activeRole === 'admin'.
 * Fetches the KPI first to verify ownership before inserting (T-02-P03-02).
 */
export async function recordKpiReading(
  kpiId: string,
  values: KpiReadingInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kpiReadingSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta    = user.app_metadata as Record<string, string>
    const activeRole = appMeta?.active_role

    // Fetch KPI to verify existence and get owner_id + institution_id
    const { data: kpi, error: kpiError } = await supabase
      .from('kpis')
      .select('owner_id, institution_id')
      .eq('id', kpiId)
      .single()

    if (kpiError || !kpi) {
      return { error: 'KPI not found.' }
    }

    // Owner check: must be KPI owner OR admin (T-02-P03-02)
    const kpiRecord = kpi as { owner_id: string; institution_id: string }
    if (kpiRecord.owner_id !== user.id && activeRole !== 'admin') {
      return { error: 'Only the KPI owner or an administrator can record readings.' }
    }

    // Insert reading — institution_id comes from the KPI record (not client input)
    const { data, error } = await supabase
      .from('kpi_readings')
      .insert({
        ...parsed.data,
        kpi_id: kpiId,
        institution_id: kpiRecord.institution_id,
        recorded_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[recordKpiReading] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath(`/strategic/kpis/${kpiId}`)
    revalidatePath('/strategic')

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[recordKpiReading] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
