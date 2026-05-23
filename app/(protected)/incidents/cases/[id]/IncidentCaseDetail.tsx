import Link from 'next/link'
import { AlertTriangle, Lock, ShieldCheck, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppRole } from '@/types/auth'
import { IncidentCategoryBadge } from '@/components/incidents/IncidentCategoryBadge'
import { INCIDENT_STATUS_LABELS, type IncidentStatus } from '@/types/incidents'
import { TriageForm } from './triage/TriageForm'
import { StatusUpdateForm } from './status/StatusUpdateForm'

interface IncidentDetail {
  id: string
  case_reference: string
  title: string
  description: string
  category: 'fraud' | 'misconduct' | 'safety' | 'cyber' | 'governance' | 'other'
  status: IncidentStatus
  severity: 'low' | 'medium' | 'high' | 'critical'
  visibility: 'investigator_admin_only' | 'oversight_visible'
  is_anonymous: boolean
  reporter_name: string | null
  reporter_contact: string | null
  assigned_investigator_id: string | null
  assigned_investigator_name: string
  resolution_summary: string | null
  sla_due_date: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

interface IncidentEvent {
  id: string
  event_type: string
  notes: string
  actor_name: string
  created_at: string
}

interface IncidentEvidence {
  id: string
  original_filename: string
  mime_type: string
  file_size_bytes: number
  sha256_hash: string
  uploaded_at: string
}

interface InvestigatorOption {
  id: string
  name: string
  role: string
}

interface IncidentCaseDetailProps {
  incident: IncidentDetail
  events: IncidentEvent[]
  evidence: IncidentEvidence[]
  investigators: InvestigatorOption[]
  activeRole: AppRole
}

const TRIAGE_ROLES: AppRole[] = ['admin', 'compliance-officer']
const STATUS_ROLES: AppRole[] = ['admin', 'compliance-officer']

const STATUS_BADGE: Record<IncidentStatus, string> = {
  new: 'bg-paper text-navy-mid border-paper-border',
  assigned: 'bg-blue-50 text-blue-700 border-blue-200',
  in_investigation: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  escalated: 'bg-err/10 text-err border-err/30',
  closed: 'bg-ok/10 text-ok border-ok/30',
}

export function IncidentCaseDetail({ incident, events, evidence, investigators, activeRole }: IncidentCaseDetailProps) {
  const overdue = Boolean(incident.sla_due_date && incident.status !== 'closed' && new Date(incident.sla_due_date) < new Date())
  const canTriage = TRIAGE_ROLES.includes(activeRole)
  const canManageStatus = canTriage || (incident.assigned_investigator_id !== null)

  return (
    <div>
      <p className="mb-2 text-[14px] text-navy-mid">
        <Link href="/incidents" className="hover:underline">
          Incidents
        </Link>
        {' / '}
        <Link href="/incidents/cases" className="hover:underline">
          Cases
        </Link>
        {' / '}
        <span className="text-navy-900">{incident.case_reference}</span>
      </p>

      <div className="mb-4">
        <h1 className="font-serif text-[28px] font-semibold leading-[1.2] text-navy-900">{incident.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-[8px]">
          <span className="inline-flex rounded-[6px] border border-paper-border bg-paper px-[8px] py-[4px] font-mono text-[14px] text-navy-mid">
            {incident.case_reference}
          </span>
          <IncidentCategoryBadge category={incident.category} />
          <span className={cn('inline-flex rounded-[6px] border px-[8px] py-[4px] text-[13px] font-medium', STATUS_BADGE[incident.status])}>
            {INCIDENT_STATUS_LABELS[incident.status]}
          </span>
        </div>
      </div>

      {overdue && (
        <div className="mb-6 rounded-[8px] border border-err/30 bg-err/10 p-3">
          <p className="flex items-center gap-2 text-[14px] font-medium text-err">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            SLA due date has passed. Escalation review is required.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[16px] font-semibold text-navy-900">Case Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Narrative</p>
                <p className="mt-1 text-[16px] text-navy-900">{incident.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Severity</p>
                  <p className="mt-1 text-[14px] text-navy-900">{incident.severity}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Visibility</p>
                  <p className="mt-1 text-[14px] text-navy-900">{incident.visibility.replaceAll('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Assigned Investigator</p>
                  <p className="mt-1 text-[14px] text-navy-900">{incident.assigned_investigator_name}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">SLA Due Date</p>
                  <p className={cn('mt-1 font-mono text-[14px]', overdue ? 'font-semibold text-err' : 'text-navy-mid')}>
                    {incident.sla_due_date ? new Date(incident.sla_due_date).toISOString().slice(0, 10) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="rounded-[8px] border border-paper-border bg-paper p-4">
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Reporter Confidentiality</p>
                {incident.is_anonymous ? (
                  <p className="flex items-center gap-2 text-[14px] font-medium text-navy-900">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    Anonymous report: identity fields are intentionally removed.
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-[14px] text-navy-900">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    {incident.reporter_name || 'Named submitter'} {incident.reporter_contact ? `(${incident.reporter_contact})` : ''}
                  </p>
                )}
              </div>

              {incident.resolution_summary && (
                <div className="rounded-[8px] border border-ok/30 bg-ok/10 p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-ok">Resolution Summary</p>
                  <p className="mt-1 text-[14px] text-navy-900">{incident.resolution_summary}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[16px] font-semibold text-navy-900">Case Timeline</h2>
            {events.length === 0 ? (
              <p className="text-[14px] text-navy-mid">No timeline events yet.</p>
            ) : (
              <ol className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="rounded-[8px] border border-paper-border bg-paper p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">{event.event_type.replaceAll('_', ' ')}</span>
                      <span className="font-mono text-[12px] text-navy-mid">{new Date(event.created_at).toISOString().slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    <p className="text-[14px] text-navy-900">{event.notes}</p>
                    <p className="mt-1 text-[12px] text-navy-mid">By: {event.actor_name}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[16px] font-semibold text-navy-900">Evidence Metadata</h2>
            {evidence.length === 0 ? (
              <p className="text-[14px] text-navy-mid">No evidence uploaded for this case yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-paper">
                      <th className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">File</th>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Type</th>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Size</th>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map((file) => (
                      <tr key={file.id} className="border-t border-paper-border">
                        <td className="px-3 py-2 text-[14px] text-navy-900">{file.original_filename}</td>
                        <td className="px-3 py-2 text-[13px] text-navy-mid">{file.mime_type}</td>
                        <td className="px-3 py-2 text-[13px] text-navy-mid">{Math.ceil(file.file_size_bytes / 1024)} KB</td>
                        <td className="px-3 py-2 font-mono text-[12px] text-navy-mid">{new Date(file.uploaded_at).toISOString().slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[16px] font-semibold text-navy-900">Triage Assignment</h2>
            {canTriage ? (
              <TriageForm caseId={incident.id} initialAssigneeId={incident.assigned_investigator_id} investigators={investigators} />
            ) : (
              <p className="text-[14px] text-navy-mid">Only admin/compliance roles can assign investigators.</p>
            )}
          </div>

          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[16px] font-semibold text-navy-900">Status Progression</h2>
            <StatusUpdateForm caseId={incident.id} currentStatus={incident.status} canManage={canManageStatus || STATUS_ROLES.includes(activeRole)} />
          </div>

          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <p className="mb-2 flex items-center gap-2 text-[14px] font-medium text-navy-900">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Confidential workflow notice
            </p>
            <p className="text-[13px] text-navy-mid">
              Route visibility is an affordance only. Final access control is enforced by RLS and role checks in server actions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
