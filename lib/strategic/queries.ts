// lib/strategic/queries.ts
// Server-side query helpers for strategic planning pages.
// These are imported by Server Components — NOT Server Actions.
// Each function accepts a supabase SupabaseClient to share the request-scoped client.

import type { SupabaseClient } from '@supabase/supabase-js'

export const KPI_PAGE_SIZE = 20 // D-21: 20 rows per page

/**
 * Fetch paginated KPIs with embedded objective title and all readings.
 * Readings are fetched as an array — caller uses getLatestReading() to find the most recent.
 * Approach A per RESEARCH.md Q3: no DISTINCT ON view needed at prototype scale.
 */
export async function getKpisWithReadings(
  supabase: SupabaseClient,
  { page = 1 }: { page?: number } = {}
) {
  const { data, count, error } = await supabase
    .from('kpis')
    .select(
      `
      id,
      title,
      description,
      owner_id,
      baseline_value,
      target_value,
      unit_of_measure,
      reporting_frequency,
      objective_id,
      strategic_objectives ( id, title ),
      kpi_readings ( actual_value, reporting_period, recorded_at ),
      user_profiles!owner_id ( full_name )
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * KPI_PAGE_SIZE, page * KPI_PAGE_SIZE - 1)

  return { data: data ?? [], count: count ?? 0, error }
}

/**
 * Fetch all strategic objectives for the authenticated institution.
 * RLS enforces institution_id scoping — no manual filter needed.
 */
export async function getObjectives(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('strategic_objectives')
    .select(
      `
      id,
      title,
      description,
      status,
      nds2_pillar,
      institutional_goal,
      owner_id,
      start_date,
      target_date,
      created_at,
      user_profiles!owner_id ( full_name )
      `
    )
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

/**
 * Select the most recent reading from an array of kpi_readings.
 * Sorted by recorded_at descending; returns null if array is empty.
 * This is the Approach A "latest reading" selection per RESEARCH.md Q3.
 */
export function getLatestReading(
  readings: { actual_value: number; reporting_period: string; recorded_at: string }[]
): { actual_value: number; reporting_period: string; recorded_at: string } | null {
  if (!readings || readings.length === 0) return null
  return [...readings].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )[0]
}
