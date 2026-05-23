import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getIncidentCaseById, listIncidentEvents, listIncidentEvidence } from '@/lib/incidents/queries'
import { IncidentCaseDetail } from './IncidentCaseDetail'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin',
  'ceo',
  'compliance-officer',
  'audit-officer',
  'risk-officer',
  'dept-head',
  'board-member',
]

interface PageProps {
  params: { id: string }
}

export default async function IncidentCaseDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const [caseResult, eventsResult, evidenceResult, investigatorResult] = await Promise.all([
    getIncidentCaseById(supabase, params.id),
    listIncidentEvents(supabase, params.id),
    listIncidentEvidence(supabase, params.id),
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name, active_role, status')
      .eq('status', 'approved')
      .order('last_name'),
  ])

  if (caseResult.error || !caseResult.data) {
    notFound()
  }

  const incident = caseResult.data as Record<string, unknown>

  const detail = {
    id: incident.id as string,
    case_reference: (incident.case_reference as string | undefined) ?? String(incident.id).slice(0, 8).toUpperCase(),
    title: incident.title as string,
    description: incident.description as string,
    category: incident.category as 'fraud' | 'misconduct' | 'safety' | 'cyber' | 'governance' | 'other',
    status: incident.status as 'new' | 'assigned' | 'in_investigation' | 'escalated' | 'closed',
    severity: incident.severity as 'low' | 'medium' | 'high' | 'critical',
    visibility: incident.visibility as 'investigator_admin_only' | 'oversight_visible',
    is_anonymous: Boolean(incident.is_anonymous),
    reporter_name: incident.reporter_name as string | null,
    reporter_contact: incident.reporter_contact as string | null,
    assigned_investigator_id: incident.assigned_investigator_id as string | null,
    assigned_investigator_name:
      [
        (incident as { user_profiles?: { first_name?: string | null; last_name?: string | null } }).user_profiles?.first_name,
        (incident as { user_profiles?: { first_name?: string | null; last_name?: string | null } }).user_profiles?.last_name,
      ]
        .filter(Boolean)
        .join(' ') || 'Unassigned',
    resolution_summary: incident.resolution_summary as string | null,
    sla_due_date: incident.sla_due_date as string | null,
    closed_at: incident.closed_at as string | null,
    created_at: incident.created_at as string,
    updated_at: incident.updated_at as string,
  }

  const events = (eventsResult.data as Array<Record<string, unknown>>).map((event) => ({
    id: event.id as string,
    event_type: event.event_type as string,
    notes: event.notes as string,
    actor_name: (event.actor_name as string | null) ?? 'System',
    created_at: event.created_at as string,
  }))

  const evidence = (evidenceResult.data as Array<Record<string, unknown>>).map((file) => ({
    id: file.id as string,
    original_filename: (file.original_filename as string | undefined) ?? 'Evidence',
    mime_type: file.mime_type as string,
    file_size_bytes: Number(file.file_size_bytes ?? 0),
    sha256_hash: (file.sha256_hash as string | undefined) ?? '',
    uploaded_at: file.uploaded_at as string,
  }))

  const investigators = ((investigatorResult.data ?? []) as Array<Record<string, unknown>>)
    .filter((profile) => {
      const role = String(profile.active_role ?? '')
      return ['admin', 'audit-officer', 'risk-officer', 'compliance-officer'].includes(role)
    })
    .map((profile) => ({
      id: profile.id as string,
      name: [profile.first_name as string | null, profile.last_name as string | null].filter(Boolean).join(' ') || 'Unnamed user',
      role: String(profile.active_role ?? 'unknown'),
    }))

  return (
    <IncidentCaseDetail
      incident={detail}
      events={events}
      evidence={evidence}
      investigators={investigators}
      activeRole={activeRole}
    />
  )
}
