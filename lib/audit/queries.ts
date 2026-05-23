import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { AuditFindingSeverity, AuditFindingStatus, AuditLinkedEntityType } from '@/types/audit'

type DbClient = SupabaseClient<Database>

export interface AuditEscalationTarget {
  id: string
  title: string
  due_date: string
  remediation_owner_id: string | null
  institution_id: string
}

export async function listAuditFindings(supabase: DbClient) {
  const { data, error } = await supabase
    .from('audit_findings')
    .select(`
      id,
      finding_reference,
      title,
      severity,
      status,
      remediation_owner_id,
      due_date,
      review_date,
      linked_entity_type,
      linked_entity_id,
      created_at,
      user_profiles!remediation_owner_id ( first_name, last_name )
    `)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function getAuditFindingById(supabase: DbClient, findingId: string) {
  const { data, error } = await supabase
    .from('audit_findings')
    .select(`
      id,
      institution_id,
      finding_reference,
      title,
      description,
      severity,
      status,
      root_cause,
      linked_entity_type,
      linked_entity_id,
      remediation_owner_id,
      review_date,
      due_date,
      created_by,
      closed_at,
      created_at,
      updated_at,
      user_profiles!remediation_owner_id ( first_name, last_name ),
      user_profiles!created_by ( first_name, last_name )
    `)
    .eq('id', findingId)
    .single()

  return { data, error }
}

export async function listAuditFindingEvidence(supabase: DbClient, findingId: string) {
  const { data, error } = await supabase
    .from('audit_finding_evidence')
    .select(`
      id,
      finding_id,
      original_filename,
      mime_type,
      file_size_bytes,
      sha256_hash,
      uploaded_at,
      user_profiles!uploaded_by ( first_name, last_name )
    `)
    .eq('finding_id', findingId)
    .order('uploaded_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function getAuditDashboardStats(supabase: DbClient) {
  const today = new Date().toISOString().slice(0, 10)

  const [allResult, overdueResult] = await Promise.all([
    supabase.from('audit_findings').select('severity, status'),
    supabase
      .from('audit_findings')
      .select('*', { count: 'exact', head: true })
      .lt('due_date', today)
      .neq('status', 'closed'),
  ])

  const rows = (allResult.data ?? []) as Array<{
    severity: AuditFindingSeverity
    status: AuditFindingStatus
  }>

  const openBySeverity: Record<AuditFindingSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }

  for (const row of rows) {
    if (row.status !== 'closed') {
      openBySeverity[row.severity] += 1
    }
  }

  return {
    openBySeverity,
    overdueCount: overdueResult.count ?? 0,
    totalOpen: rows.filter((r) => r.status !== 'closed').length,
  }
}

export async function getAuditFindingsForEscalation(supabase: DbClient) {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('audit_findings')
    .select('id, title, due_date, remediation_owner_id, institution_id')
    .lte('due_date', today)
    .neq('status', 'closed')
    .order('due_date', { ascending: true })

  return { data: (data ?? []) as AuditEscalationTarget[], error }
}

export interface AuditFindingListRow {
  id: string
  finding_reference: string
  title: string
  severity: AuditFindingSeverity
  status: AuditFindingStatus
  remediation_owner_id: string | null
  due_date: string
  review_date: string
  linked_entity_type: AuditLinkedEntityType
  linked_entity_id: string
  created_at: string
  user_profiles: { first_name: string | null; last_name: string | null } | null
}
