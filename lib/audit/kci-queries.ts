// lib/audit/kci-queries.ts
// Server-side query helpers for KCI pages.
// Imported by Server Components — NOT Server Actions.

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch all KCI definitions with embedded latest reading for list page.
 */
export async function getKcisWithReadings(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('kci_definitions')
    .select(
      `
      id,
      title,
      description,
      unit_of_measure,
      target_value,
      alert_threshold,
      direction,
      owner_id,
      reporting_frequency,
      treatment_id,
      risk_treatments ( id, title ),
      kci_readings ( id, actual_value, status, period_start, period_end, recorded_at ),
      user_profiles!owner_id ( first_name, last_name )
      `
    )
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

/**
 * Fetch a single KCI definition with all its readings.
 */
export async function getKciById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('kci_definitions')
    .select(
      `
      id,
      title,
      description,
      unit_of_measure,
      target_value,
      alert_threshold,
      direction,
      owner_id,
      reporting_frequency,
      treatment_id,
      created_at,
      updated_at,
      risk_treatments ( id, title ),
      kci_readings ( id, actual_value, status, period_start, period_end, notes, recorded_at, recorded_by ),
      user_profiles!owner_id ( first_name, last_name )
      `
    )
    .eq('id', id)
    .single()

  return { data, error }
}

/**
 * Select the most recent reading from an array of kci_readings.
 */
export function getLatestKciReading<
  T extends { recorded_at: string }
>(readings: T[] | null | undefined): T | null {
  if (!readings || readings.length === 0) return null
  return [...readings].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )[0] ?? null
}

/**
 * Fetch KCI dashboard stats: on_track %, breached count for the authenticated institution.
 */
export async function getKciDashboardStats(supabase: SupabaseClient) {
  const { data: readings, error } = await supabase
    .from('kci_readings')
    .select('kci_id, status, recorded_at')
    .order('recorded_at', { ascending: false })

  if (error || !readings) return { total: 0, on_track: 0, breached: 0, pct_on_track: 0 }

  // Get latest reading per KCI
  const latestByKci = new Map<string, string>()
  for (const r of readings) {
    const row = r as { kci_id: string; status: string; recorded_at: string }
    if (!latestByKci.has(row.kci_id)) {
      latestByKci.set(row.kci_id, row.status)
    }
  }

  const total    = latestByKci.size
  let on_track   = 0
  let breached   = 0
  for (const status of latestByKci.values()) {
    if (status === 'on_track') on_track++
    if (status === 'breached') breached++
  }
  const pct_on_track = total > 0 ? Math.round((on_track / total) * 100) : 0
  return { total, on_track, breached, pct_on_track }
}
