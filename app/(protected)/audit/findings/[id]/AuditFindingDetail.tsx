import Link from 'next/link'
import { AlertTriangle, FileX, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppRole } from '@/types/auth'
import {
  AUDIT_FINDING_SEVERITY_LABELS,
  AUDIT_FINDING_STATUS_LABELS,
  AUDIT_LINKED_ENTITY_LABELS,
  type AuditFindingSeverity,
  type AuditFindingStatus,
  type AuditLinkedEntityType,
} from '@/types/audit'
import { AUDIT_FINDING_STATUS_BADGE, isAuditFindingOverdue } from '@/lib/audit/audit-utils'
import { StatusUpdateForm } from './status/StatusUpdateForm'
import { AuditEvidenceRow } from '@/components/audit/AuditEvidenceRow'

interface AuditFindingDetailProps {
  finding: {
    id: string
    finding_reference: string
    title: string
    description: string | null
    severity: AuditFindingSeverity
    status: AuditFindingStatus
    root_cause: string
    linked_entity_type: AuditLinkedEntityType
    linked_entity_id: string
    remediation_owner_id: string | null
    review_date: string
    due_date: string
    closed_at: string | null
    created_at: string
    updated_at: string | null
    user_profiles: { first_name: string | null; last_name: string | null } | null
  }
  evidence: Array<{
    id: string
    original_filename: string
    file_size_bytes: number
    mime_type: string
    sha256_hash: string
    uploaded_at: string
    user_profiles: { first_name: string | null; last_name: string | null } | null
  }>
  activeRole: AppRole
}

const MANAGE_ROLES: AppRole[] = ['admin', 'audit-officer']

export function AuditFindingDetail({ finding, evidence, activeRole }: AuditFindingDetailProps) {
  const ownerName =
    [finding.user_profiles?.first_name, finding.user_profiles?.last_name].filter(Boolean).join(' ') || 'Unassigned'

  const overdue = isAuditFindingOverdue(finding.status, finding.due_date)
  const canManage = MANAGE_ROLES.includes(activeRole)

  return (
    <div>
      <p className="mb-2 text-[14px] text-navy-mid">
        <Link href="/audit" className="hover:underline">Audit</Link>
        {' / '}
        <Link href="/audit/findings" className="hover:underline">Findings</Link>
        {' / '}
        <span className="text-navy-900">{finding.finding_reference}</span>
      </p>

      <div className="mb-4">
        <h1 className="font-serif text-[28px] font-semibold leading-[1.2] text-navy-900">{finding.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-[8px]">
          <span className="inline-flex rounded-[6px] border border-paper-border bg-paper px-[8px] py-[4px] font-mono text-[14px] text-navy-mid">
            {finding.finding_reference}
          </span>
          <span className="inline-flex rounded-[6px] border border-paper-border bg-white px-[8px] py-[4px] text-[14px] text-navy-900">
            {AUDIT_FINDING_SEVERITY_LABELS[finding.severity]}
          </span>
          <span className={cn('inline-flex font-medium', AUDIT_FINDING_STATUS_BADGE[finding.status])}>
            {AUDIT_FINDING_STATUS_LABELS[finding.status]}
          </span>
          <span className={cn('font-mono text-[14px]', overdue ? 'font-semibold text-err' : 'text-navy-mid')}>
            Due {finding.due_date}
          </span>
        </div>
      </div>

      {overdue && finding.status !== 'closed' && (
        <div className="mb-6 rounded-[8px] border border-err/30 bg-err/10 p-3">
          <p className="flex items-center gap-2 text-[14px] font-medium text-err">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            This finding is overdue and requires immediate remediation action.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[16px] font-semibold text-navy-900">Finding Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Description</p>
                <p className="mt-1 text-[16px] text-navy-900">
                  {finding.description ?? <span className="italic text-navy-mid">No description provided.</span>}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Root Cause</p>
                <p className="mt-1 text-[16px] text-navy-900">{finding.root_cause}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Linked Entity</p>
                  <p className="mt-1 text-[14px] text-navy-900">
                    {AUDIT_LINKED_ENTITY_LABELS[finding.linked_entity_type]} · <span className="font-mono">{finding.linked_entity_id}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Remediation Owner</p>
                  <p className="mt-1 text-[14px] text-navy-900">{ownerName}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Review Date</p>
                  <p className="mt-1 font-mono text-[14px] text-navy-mid">{finding.review_date}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Created</p>
                  <p className="mt-1 font-mono text-[14px] text-navy-mid">{new Date(finding.created_at).toISOString().slice(0, 10)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-navy-900">Closure Evidence</h2>
              <Link
                href={`/audit/findings/${finding.id}/evidence/upload`}
                className="inline-flex items-center gap-[6px] rounded-[6px] bg-gold px-[10px] py-[6px] text-[13px] font-semibold text-navy-950 hover:bg-gold-hi"
              >
                <Upload className="h-[13px] w-[13px]" aria-hidden="true" />
                Upload
              </Link>
            </div>

            {evidence.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <FileX className="mb-3 h-7 w-7 text-paper-border" aria-hidden="true" />
                <p className="text-[14px] text-navy-mid">No evidence uploaded</p>
              </div>
            ) : (
              <div className="flex flex-col gap-[8px]">
                {evidence.map((file) => {
                  const uploaderName =
                    [file.user_profiles?.first_name, file.user_profiles?.last_name].filter(Boolean).join(' ') || 'Unknown'
                  return (
                    <AuditEvidenceRow
                      key={file.id}
                      originalFilename={file.original_filename}
                      fileSizeBytes={file.file_size_bytes}
                      mimeType={file.mime_type}
                      sha256Hash={file.sha256_hash}
                      uploadedAt={file.uploaded_at}
                      uploadedByName={uploaderName}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[16px] font-semibold text-navy-900">Status Transition</h2>
            <StatusUpdateForm
              findingId={finding.id}
              currentStatus={finding.status}
              canManage={canManage || (finding.remediation_owner_id !== null)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
