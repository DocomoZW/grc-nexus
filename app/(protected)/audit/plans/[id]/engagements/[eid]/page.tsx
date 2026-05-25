// app/(protected)/audit/plans/[id]/engagements/[eid]/page.tsx
// Engagement detail — test procedures + workpapers inline
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getAuditEngagementById } from '@/lib/audit/universe-queries'
import {
  AUDIT_ENGAGEMENT_STATUS_LABELS,
  AUDIT_PROCEDURE_RESULT_LABELS,
  type AuditEngagementStatus,
  type AuditProcedureResult,
} from '@/types/audit-universe'
import { cn } from '@/lib/utils'
import { EngagementStatusForm } from './EngagementStatusForm'
import { ProcedureResultForm }  from './ProcedureResultForm'
import { AddProcedureForm }     from './AddProcedureForm'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin', 'ceo', 'audit-officer', 'risk-officer', 'compliance-officer', 'board-member', 'dept-head',
]

const ENG_STATUS_BADGE: Record<AuditEngagementStatus, string> = {
  planned:    'bg-paper text-navy-mid border border-paper-border',
  fieldwork:  'bg-warn/10 text-warn border border-warn/30',
  reporting:  'bg-teal-50 text-teal-700 border border-teal-200',
  completed:  'bg-ok/10 text-ok border border-ok/30',
  cancelled:  'bg-err/10 text-err border border-err/30',
}

const RESULT_BADGE: Record<AuditProcedureResult, string> = {
  not_started:    'bg-paper text-navy-mid border border-paper-border',
  pass:           'bg-ok/10 text-ok border border-ok/30',
  fail:           'bg-err/10 text-err border border-err/30',
  exception:      'bg-warn/10 text-warn border border-warn/30',
  not_applicable: 'bg-slate-100 text-slate-600 border border-slate-200',
}

type ProcedureRow = {
  id: string
  step_number: number
  objective: string
  procedure_text: string
  result: AuditProcedureResult
  performed_at: string | null
  notes: string | null
}

type WorkpaperRow = {
  id: string
  title: string
  reference_number: string | null
  description: string | null
  created_at?: string
}

type EngagementDetail = {
  id: string
  plan_id: string
  title: string
  description: string | null
  auditee_dept: string | null
  status: AuditEngagementStatus
  planned_start: string
  planned_end: string
  actual_start: string | null
  actual_end: string | null
  opinion: string | null
  audit_test_procedures: ProcedureRow[] | null
  audit_workpapers: WorkpaperRow[] | null
}

interface PageProps {
  params: { id: string; eid: string }
}

export default async function EngagementDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const { data } = await getAuditEngagementById(supabase, params.eid)
  if (!data) notFound()

  const eng = data as unknown as EngagementDetail
  const procedures = [...(eng.audit_test_procedures ?? [])].sort((a, b) => a.step_number - b.step_number)
  const workpapers = eng.audit_workpapers ?? []
  const canManage  = activeRole === 'admin' || activeRole === 'audit-officer'

  return (
    <div>
      <p className="mb-2 text-[14px] text-navy-mid">
        <Link href="/audit/plans" className="hover:underline">Plans</Link>
        {' / '}
        <Link href={`/audit/plans/${params.id}`} className="hover:underline">Plan</Link>
        {' / '}
        <span className="text-navy-900">{eng.title}</span>
      </p>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[20px] font-semibold text-navy-900">{eng.title}</h1>
            <span className={cn('inline-flex rounded-[6px] px-[8px] py-[3px] text-[12px] font-medium', ENG_STATUS_BADGE[eng.status])}>
              {AUDIT_ENGAGEMENT_STATUS_LABELS[eng.status]}
            </span>
          </div>
          {eng.auditee_dept && <p className="mt-1 text-[14px] text-navy-mid">Dept: {eng.auditee_dept}</p>}
        </div>
        {canManage && (
          <Link
            href={`/audit/plans/${params.id}/engagements/${params.eid}/workpapers/new`}
            className="inline-flex items-center rounded-[8px] border border-paper-border bg-white px-4 py-2 text-[13px] font-medium text-navy-900 hover:bg-paper"
          >
            Add Workpaper
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Left: details + status */}
        <div className="space-y-6">
          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-navy-900">Details</h2>
            <dl className="space-y-3 text-[13px]">
              {eng.description && (
                <div>
                  <dt className="text-navy-mid">Description</dt>
                  <dd className="mt-0.5 text-navy-900">{eng.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-navy-mid">Planned Period</dt>
                <dd className="mt-0.5 font-mono text-navy-900">{eng.planned_start} – {eng.planned_end}</dd>
              </div>
              {(eng.actual_start || eng.actual_end) && (
                <div>
                  <dt className="text-navy-mid">Actual Period</dt>
                  <dd className="mt-0.5 font-mono text-navy-900">{eng.actual_start ?? '?'} – {eng.actual_end ?? '?'}</dd>
                </div>
              )}
              {eng.opinion && (
                <div>
                  <dt className="text-navy-mid">Opinion</dt>
                  <dd className="mt-0.5 text-navy-900">{eng.opinion}</dd>
                </div>
              )}
            </dl>
          </div>

          {canManage && (
            <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-navy-900">Update Status</h2>
              <EngagementStatusForm engagementId={eng.id} currentStatus={eng.status} />
            </div>
          )}

          {/* Workpapers list */}
          <div className="rounded-[10px] border border-paper-border bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-paper-border px-6 py-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-navy-900">Workpapers ({workpapers.length})</h2>
            </div>
            {workpapers.length === 0 ? (
              <p className="px-6 py-6 text-[13px] text-navy-mid">No workpapers attached.</p>
            ) : (
              <ul className="divide-y divide-paper-border">
                {workpapers.map((wp) => (
                  <li key={wp.id} className="px-6 py-4">
                    <p className="text-[13px] font-medium text-navy-900">{wp.title}</p>
                    {wp.reference_number && <p className="font-mono text-[12px] text-navy-mid">{wp.reference_number}</p>}
                    {wp.description && <p className="text-[12px] text-navy-mid mt-0.5">{wp.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: test procedures */}
        <div className="space-y-6">
          <div className="rounded-[10px] border border-paper-border bg-white shadow-card">
            <div className="border-b border-paper-border px-6 py-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-navy-900">Test Procedures ({procedures.length})</h2>
            </div>
            {procedures.length === 0 ? (
              <p className="px-6 py-6 text-[13px] text-navy-mid">No test procedures added yet.</p>
            ) : (
              <div className="divide-y divide-paper-border">
                {procedures.map((proc) => (
                  <div key={proc.id} className="px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy-50 text-[12px] font-semibold text-navy-900">
                          {proc.step_number}
                        </span>
                        <span className={cn('inline-flex rounded-[6px] px-[8px] py-[3px] text-[12px] font-medium', RESULT_BADGE[proc.result])}>
                          {AUDIT_PROCEDURE_RESULT_LABELS[proc.result]}
                        </span>
                      </div>
                      {proc.performed_at && <span className="font-mono text-[12px] text-navy-mid">{proc.performed_at.slice(0, 10)}</span>}
                    </div>
                    <p className="text-[13px] font-medium text-navy-900 mb-1">{proc.objective}</p>
                    <p className="text-[12px] text-navy-mid">{proc.procedure_text}</p>
                    {proc.notes && <p className="mt-1 text-[12px] italic text-navy-mid">{proc.notes}</p>}
                    {canManage && (
                      <div className="mt-3">
                        <ProcedureResultForm procedureId={proc.id} currentResult={proc.result} engagementId={eng.id} planId={params.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage && (
            <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-navy-900">Add Test Procedure</h2>
              <AddProcedureForm engagementId={eng.id} nextStep={(procedures[procedures.length - 1]?.step_number ?? 0) + 1} planId={params.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
