import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { IncidentStatus, IncidentCategory, IncidentVisibility } from '@/types/incidents'

type DbClient = SupabaseClient<Database>

export interface IncidentEscalationTarget {
  id: string
  title: string
  category: IncidentCategory
  status: IncidentStatus
  sla_due_date: string | null
  assigned_investigator_id: string | null
  institution_id: string
}

/**
 * List all incidents for the authenticated user's institution.
 * respects RLS policies for role-segregated visibility.
 */
export async function listIncidentCases(supabase: DbClient) {
  const { data, error } = await supabase
    .from('incident_cases')
    .select(`
      id, institution_id, case_reference, title, description, category,
      status, visibility, severity, is_anonymous, reported_by_user_id,
      reporter_name, reporter_contact, assigned_investigator_id,
      resolution_summary, sla_due_date, closed_at, created_at, updated_at,
      user_profiles!assigned_investigator_id ( first_name, last_name )
    `)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

/**
 * Get a single incident case by ID with full details.
 */
export async function getIncidentCaseById(supabase: DbClient, caseId: string) {
  const { data, error } = await supabase
    .from('incident_cases')
    .select(`
      id, institution_id, case_reference, title, description, category,
      status, visibility, severity, is_anonymous, reported_by_user_id,
      reporter_name, reporter_contact, assigned_investigator_id,
      resolution_summary, sla_due_date, closed_at, created_at, updated_at,
      user_profiles!assigned_investigator_id ( first_name, last_name ),
      user_profiles!reported_by_user_id ( first_name, last_name )
    `)
    .eq('id', caseId)
    .single()

  return { data, error }
}

/**
 * List timeline events for an incident, ordered by creation date ascending.
 */
export async function listIncidentEvents(supabase: DbClient, caseId: string) {
  const { data, error } = await supabase
    .from('incident_case_events')
    .select(`
      id, case_id, event_type, notes, actor_id, actor_name, created_at
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  return { data: data ?? [], error }
}

/**
 * List evidence uploaded for an incident, ordered by upload date ascending.
 */
export async function listIncidentEvidence(supabase: DbClient, caseId: string) {
  const { data, error } = await supabase
    .from('incident_case_evidence')
    .select(`
      id, case_id, storage_path, original_filename, mime_type, file_size_bytes,
      sha256_hash, uploaded_by, uploaded_at,
      user_profiles!uploaded_by ( first_name, last_name )
    `)
    .eq('case_id', caseId)
    .order('uploaded_at', { ascending: true })

  return { data: data ?? [], error }
}

/**
 * Incident overview stats.
 * Returns distribution counts by status, overdue counts, and escalated counts.
 */
export async function getIncidentDashboardStats(supabase: DbClient) {
  const today = new Date().toISOString()

  const [statusResult, overdueResult, escalatedResult] = await Promise.all([
    supabase.from('incident_cases').select('status'),
    supabase
      .from('incident_cases')
      .select('*', { count: 'exact', head: true })
      .lt('sla_due_date', today)
      .not('status', 'eq', 'closed'),
    supabase
      .from('incident_cases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'escalated'),
  ])

  return {
    cases: statusResult.data ?? [],
    overdueCount: overdueResult.count ?? 0,
    escalatedCount: escalatedResult.count ?? 0,
  }
}

/**
 * Fetch all incident cases that are overdue or approaching SLA breaches.
 */
export async function getIncidentCasesForEscalation(supabase: DbClient) {
  const { data, error } = await supabase
    .from('incident_cases')
    .select('id, title, category, status, sla_due_date, assigned_investigator_id, institution_id')
    .not('status', 'eq', 'closed')
    .order('sla_due_date', { ascending: true })

  return { data: (data ?? []) as IncidentEscalationTarget[], error }
}
