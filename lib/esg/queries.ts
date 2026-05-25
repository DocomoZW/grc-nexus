// lib/esg/queries.ts
// Phase 12 — ESG query helpers (server-side, uses RLS-scoped client).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EsgFramework, EsgMetric, EsgReading } from '@/types/esg'

export async function listEsgFrameworks(supabase: SupabaseClient): Promise<EsgFramework[]> {
  const { data } = await supabase
    .from('esg_frameworks')
    .select('id, code, name, description')
    .order('code')
  return (data ?? []) as unknown as EsgFramework[]
}

export async function listEsgMetrics(supabase: SupabaseClient): Promise<EsgMetric[]> {
  const { data } = await supabase
    .from('esg_metrics')
    .select('*, esg_framework:esg_frameworks(code, name)')
    .order('category')
    .order('name')
  return (data ?? []) as unknown as EsgMetric[]
}

export async function getEsgMetricById(
  supabase: SupabaseClient,
  id: string,
): Promise<EsgMetric | null> {
  const { data } = await supabase
    .from('esg_metrics')
    .select('*, esg_framework:esg_frameworks(code, name)')
    .eq('id', id)
    .single()
  return (data ?? null) as unknown as EsgMetric | null
}

export async function listEsgReadings(
  supabase: SupabaseClient,
  metricId: string,
): Promise<EsgReading[]> {
  const { data } = await supabase
    .from('esg_readings')
    .select('*')
    .eq('metric_id', metricId)
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as EsgReading[]
}

export async function getEsgDashboardStats(supabase: SupabaseClient) {
  const { data: metrics } = await supabase
    .from('esg_metrics')
    .select('id, category, target_value')

  const { data: readings } = await supabase
    .from('esg_readings')
    .select('metric_id, actual_value, created_at')
    .order('created_at', { ascending: false })

  const metricList = (metrics ?? []) as { id: string; category: string; target_value: number | null }[]
  const readingList = (readings ?? []) as { metric_id: string; actual_value: number; created_at: string }[]

  // Latest reading per metric
  const latestByMetric = new Map<string, number>()
  for (const r of readingList) {
    if (!latestByMetric.has(r.metric_id)) latestByMetric.set(r.metric_id, r.actual_value)
  }

  let onTarget = 0
  let offTarget = 0
  for (const m of metricList) {
    if (m.target_value == null) continue
    const latest = latestByMetric.get(m.id)
    if (latest == null) continue
    if (latest >= m.target_value) onTarget++; else offTarget++
  }

  const byCategory: Record<string, number> = { Environmental: 0, Social: 0, Governance: 0 }
  for (const m of metricList) {
    if (m.category in byCategory) byCategory[m.category]++
  }

  return {
    totalMetrics: metricList.length,
    onTarget,
    offTarget,
    byCategory,
  }
}
