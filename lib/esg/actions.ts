'use server'
// lib/esg/actions.ts
// Phase 12 — ESG server actions.
// SECURITY: Zod safeParse; institution_id from JWT only; role checks enforced.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { esgMetricSchema, esgReadingSchema, type EsgMetricInput, type EsgReadingInput } from '@/lib/schemas/esg'

const uuidSchema    = z.string().uuid()
const GENERIC_ERROR = 'An unexpected error occurred.'
const WRITE_ROLES   = ['admin', 'compliance-officer', 'audit-officer'] as const

type WriteRole   = typeof WRITE_ROLES[number]
type ActionResult = { error: string } | { data: { id: string } }

type CtxError = { error: 'Unauthorized.' | 'Missing token claims.' }
type CtxOk    = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; activeRole: string; institutionId: string }

async function getCtx(): Promise<CtxError | CtxOk> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' as const }
  const appMeta       = user.app_metadata as Record<string, string>
  const activeRole    = appMeta?.active_role as string | undefined
  const institutionId = appMeta?.institution_id as string | undefined
  if (!activeRole || !institutionId) return { error: 'Missing token claims.' as const }
  return { supabase, userId: user.id as string, activeRole, institutionId }
}

export async function createEsgMetric(values: EsgMetricInput): Promise<ActionResult> {
  const parsed = esgMetricSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to create ESG metrics.' }
  }

  try {
    const { data, error } = await ctx.supabase
      .from('esg_metrics')
      .insert({
        ...parsed.data,
        institution_id: ctx.institutionId,
        created_by:     ctx.userId,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createEsgMetric] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/esg')
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createEsgMetric] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

export async function createEsgReading(
  metricId: string,
  values: EsgReadingInput,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(metricId).success) return { error: 'Invalid metric ID.' }
  const parsed = esgReadingSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to record ESG readings.' }
  }

  try {
    const { data, error } = await ctx.supabase
      .from('esg_readings')
      .insert({
        metric_id:      metricId,
        institution_id: ctx.institutionId,
        period_label:   parsed.data.period_label,
        actual_value:   parsed.data.actual_value,
        notes:          parsed.data.notes,
        evidence_url:   parsed.data.evidence_url,
        recorded_by:    ctx.userId,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createEsgReading] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath(`/esg/${metricId}`)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createEsgReading] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
