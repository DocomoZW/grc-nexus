// lib/risk/kri-queries.ts
// Server-side query helpers for KRI pages.
// Imported by Server Components — NOT Server Actions.

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch all KRI definitions with embedded latest reading for list page.
 * Readings fetched as array — caller uses getLatestKriReading() to find most recent.
 */
export async function getKrisWithReadings(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('kri_definitions')
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
      risk_id,
      risks ( id, title ),
      kri_readings ( id, actual_value, status, period_start, period_end, recorded_at ),
      user_profiles!owner_id ( first_name, last_name )
      `
    )
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

/**
 * Fetch a single KRI definition with all its readings.
 */
export async function getKriById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('kri_definitions')
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
      risk_id,
      created_at,
      updated_at,
      risks ( id, title ),
      kri_readings ( id, actual_value, status, period_start, period_end, notes, recorded_at, recorded_by ),
      user_profiles!owner_id ( first_name, last_name )
      `
    )
    .eq('id', id)
    .single()

  return { data, error }
}

/**
 * Select the most recent reading from an array of kri_readings.
 * Sorted by recorded_at descending; returns null if array is empty.
 */
export function getLatestKriReading<
  T extends { recorded_at: string }
>(readings: T[] | null | undefined): T | null {
  if (!readings || readings.length === 0) return null
  return [...readings].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )[0] ?? null
}

/**
 * Fetch KRI dashboard stats: count by status for the authenticated institution.
 */
export async function getKriDashboardStats(supabase: SupabaseClient) {
  const { data: readings, error } = await supabase
    .from('kri_readings')
    .select('kri_id, status, recorded_at')
    .order('recorded_at', { ascending: false })

  if (error || !readings) return { on_track: 0, at_risk: 0, breached: 0, no_data: 0 }

  // Get latest reading per KRI
  const latestByKri = new Map<string, string>()
  for (const r of readings) {
    const row = r as { kri_id: string; status: string; recorded_at: string }
    if (!latestByKri.has(row.kri_id)) {
      latestByKri.set(row.kri_id, row.status)
    }
  }

  const stats = { on_track: 0, at_risk: 0, breached: 0, no_data: 0 }
  for (const status of latestByKri.values()) {
    if (status in stats) stats[status as keyof typeof stats]++
  }
  return stats
}
