'use server'
// lib/risk/kri-actions.ts
// Server Actions for KRI definition creation and reading submission.
// SECURITY: Zod safeParse before any DB call — strips unknown fields.
// SECURITY: Role checked via user.app_metadata (JWT claim) — not DB query.
// SECURITY: institutionId sourced ONLY from user.app_metadata.institution_id (JWT claim).

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  kriDefinitionSchema,
  kriReadingSchema,
  type KriDefinitionInput,
  type KriReadingInput,
} from '@/lib/schemas/kri'
import { calculateIndicatorStatus } from '@/lib/risk/kri-utils'

const KRI_CREATE_ROLES = ['admin', 'ceo', 'risk-officer'] as const
const GENERIC_ERROR    = 'An unexpected error occurred. If this persists, contact your administrator.'

// ─── createKriDefinition ─────────────────────────────────────────────────────
export async function createKriDefinition(
  values: KriDefinitionInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kriDefinitionSchema.safeParse(values)
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

    if (!KRI_CREATE_ROLES.includes(activeRole as typeof KRI_CREATE_ROLES[number])) {
      return { error: 'You do not have permission to create KRI definitions.' }
    }

    const { data, error } = await supabase
      .from('kri_definitions')
      .insert({
        ...parsed.data,
        institution_id: institutionId,
        created_by:     user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createKriDefinition] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/risk/kris')
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createKriDefinition] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── recordKriReading ────────────────────────────────────────────────────────
export async function recordKriReading(
  kriId: string,
  values: KriReadingInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kriReadingSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta       = user.app_metadata as Record<string, string>
    const institutionId = appMeta?.institution_id

    // Fetch KRI definition to compute status
    const { data: kri, error: kriErr } = await supabase
      .from('kri_definitions')
      .select('target_value, alert_threshold, direction')
      .eq('id', kriId)
      .single()

    if (kriErr || !kri) {
      return { error: 'KRI definition not found.' }
    }

    const kriDef = kri as { target_value: number; alert_threshold: number; direction: 'lower_is_worse' | 'higher_is_worse' }
    const status = calculateIndicatorStatus(
      parsed.data.actual_value,
      kriDef.target_value,
      kriDef.alert_threshold,
      kriDef.direction,
    )

    const { data, error } = await supabase
      .from('kri_readings')
      .insert({
        kri_id:         kriId,
        institution_id: institutionId,
        period_start:   parsed.data.period_start,
        period_end:     parsed.data.period_end,
        actual_value:   parsed.data.actual_value,
        notes:          parsed.data.notes ?? null,
        status,
        recorded_by:    user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[recordKriReading] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath(`/risk/kris/${kriId}`)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[recordKriReading] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
