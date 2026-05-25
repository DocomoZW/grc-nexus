'use server'
// lib/audit/kci-actions.ts
// Server Actions for KCI definition creation and reading submission.
// SECURITY: Zod safeParse before any DB call — strips unknown fields.
// SECURITY: Role checked via user.app_metadata (JWT claim) — not DB query.
// SECURITY: institutionId sourced ONLY from user.app_metadata.institution_id (JWT claim).

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  kciDefinitionSchema,
  kciReadingSchema,
  type KciDefinitionInput,
  type KciReadingInput,
} from '@/lib/schemas/kci'
import { calculateIndicatorStatus } from '@/lib/risk/kri-utils'

const KCI_CREATE_ROLES = ['admin', 'audit-officer'] as const
const GENERIC_ERROR    = 'An unexpected error occurred. If this persists, contact your administrator.'

// ─── createKciDefinition ─────────────────────────────────────────────────────
export async function createKciDefinition(
  values: KciDefinitionInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kciDefinitionSchema.safeParse(values)
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

    if (!KCI_CREATE_ROLES.includes(activeRole as typeof KCI_CREATE_ROLES[number])) {
      return { error: 'You do not have permission to create KCI definitions.' }
    }

    const { data, error } = await supabase
      .from('kci_definitions')
      .insert({
        ...parsed.data,
        institution_id: institutionId,
        created_by:     user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createKciDefinition] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/audit/kcis')
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createKciDefinition] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

// ─── recordKciReading ────────────────────────────────────────────────────────
export async function recordKciReading(
  kciId: string,
  values: KciReadingInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kciReadingSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta       = user.app_metadata as Record<string, string>
    const institutionId = appMeta?.institution_id

    // Fetch KCI definition to compute status
    const { data: kci, error: kciErr } = await supabase
      .from('kci_definitions')
      .select('target_value, alert_threshold, direction')
      .eq('id', kciId)
      .single()

    if (kciErr || !kci) {
      return { error: 'KCI definition not found.' }
    }

    const kciDef = kci as { target_value: number; alert_threshold: number; direction: 'lower_is_worse' | 'higher_is_worse' }
    const status = calculateIndicatorStatus(
      parsed.data.actual_value,
      kciDef.target_value,
      kciDef.alert_threshold,
      kciDef.direction,
    )

    const { data, error } = await supabase
      .from('kci_readings')
      .insert({
        kci_id:         kciId,
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
      console.error('[recordKciReading] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath(`/audit/kcis/${kciId}`)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[recordKciReading] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
