// app/(protected)/audit/plans/[id]/page.tsx
// Audit Plan detail — Server Component.
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getAuditPlanById } from '@/lib/audit/universe-queries'
import {
  AUDIT_PLAN_STATUS_LABELS,
  AUDIT_ENGAGEMENT_STATUS_LABELS,
  type AuditPlanStatus,
  type AuditEngagementStatus,
} from '@/types/audit-universe'
import { cn } from '@/lib/utils'
import { PlanStatusForm } from './PlanStatusForm'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin', 'ceo', 'audit-officer', 'risk-officer', 'compliance-officer', 'board-member', 'dept-head',
]

const STATUS_BADGE: Record<AuditPlanStatus, string> = {
  draft:       'bg-paper text-navy-mid border border-paper-border',
  approved:    'bg-teal-50 text-teal-700 border border-teal-200',
  in_progress: 'bg-warn/10 text-warn border border-warn/30',
  completed:   'bg-ok/10 text-ok border border-ok/30',
  cancelled:   'bg-err/10 text-err border border-err/30',
}

const ENG_STATUS_BADGE: Record<AuditEngagementStatus, string> = {
  planned:    'bg-paper text-navy-mid border border-paper-border',
  fieldwork:  'bg-warn/10 text-warn border border-warn/30',
  reporting:  'bg-teal-50 text-teal-700 border border-teal-200',
  completed:  'bg-ok/10 text-ok border border-ok/30',
  cancelled:  'bg-err/10 text-err border border-err/30',
}

type EngRow = {
  id: string
  title: string
  auditee_dept: string | null
  status: AuditEngagementStatus
  planned_start: string
  planned_end: string
  user_profiles: { first_name: string | null; last_name: string | null } | null
}

type PlanDetail = {
  id: string
  title: string
  description: string | null
  plan_year: number
  status: AuditPlanStatus
  approved_at: string | null
  created_at: string
  audit_engagements: EngRow[] | null
}

interface PageProps {
  params: { id: string }
}

export default async function AuditPlanDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const { data } = await getAuditPlanById(supabase, params.id)
  if (!data) notFound()

  const plan = data as unknown as PlanDetail
  const engagements = plan.audit_engagements ?? []
  const canManage = activeRole === 'admin' || activeRole === 'audit-officer'

  return (
    <div>
      <p className="mb-2 text-[14px] text-navy-mid">
        <Link href="/audit" className="hover:underline">Audit</Link>
        {' / '}
        <Link href="/audit/plans" className="hover:underline">Plans</Link>
        {' / '}
        <span className="text-navy-900">{plan.plan_year}</span>
      </p>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[20px] font-semibold text-navy-900">{plan.title}</h1>
            <span className={cn('inline-flex rounded-[6px] px-[8px] py-[3px] text-[12px] font-medium', STATUS_BADGE[plan.status])}>
              {AUDIT_PLAN_STATUS_LABELS[plan.status]}
            </span>
          </div>
          <p className="mt-1 text-[14px] text-navy-mid">Plan Year: {plan.plan_year}</p>
        </div>
        {canManage && (
          <Link
            href={`/audit/plans/${plan.id}/engagements/new`}
            className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[13px] font-medium text-navy-950 hover:bg-gold-hi"
          >
            Add Engagement
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: plan details + status update */}
        <div className="space-y-6">
          <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-navy-900">Plan Details</h2>
            <dl className="space-y-3 text-[13px]">
              {plan.description && (
                <div>
                  <dt className="text-navy-mid">Description</dt>
                  <dd className="mt-0.5 text-navy-900">{plan.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-navy-mid">Created</dt>
                <dd className="mt-0.5 font-mono text-navy-900">{plan.created_at.slice(0, 10)}</dd>
              </div>
              {plan.approved_at && (
                <div>
                  <dt className="text-navy-mid">Approved</dt>
                  <dd className="mt-0.5 font-mono text-navy-900">{plan.approved_at.slice(0, 10)}</dd>
                </div>
              )}
              <div>
                <dt className="text-navy-mid">Engagements</dt>
                <dd className="mt-0.5 font-mono text-navy-900">{engagements.length}</dd>
              </div>
            </dl>
          </div>

          {canManage && (
            <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-navy-900">Update Status</h2>
              <PlanStatusForm planId={plan.id} currentStatus={plan.status} />
            </div>
          )}
        </div>

        {/* Right: engagements list */}
        <div>
          <div className="rounded-[10px] border border-paper-border bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-paper-border px-6 py-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-navy-900">Engagements</h2>
            </div>
            {engagements.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-[14px] text-navy-mid">No engagements added yet.</p>
                {canManage && (
                  <Link href={`/audit/plans/${plan.id}/engagements/new`} className="mt-2 inline-block text-[13px] text-gold hover:underline">
                    Add the first engagement →
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="border-b border-paper-border bg-paper text-[12px] font-medium uppercase tracking-wide text-navy-mid">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Dept</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border">
                  {engagements.map((eng) => {
                    const profile = Array.isArray(eng.user_profiles) ? eng.user_profiles[0] : eng.user_profiles
                    const _leadName = profile
                      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
                      : '—'

                    return (
                      <tr key={eng.id} className="hover:bg-paper/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-navy-900 max-w-[180px] truncate">{eng.title}</td>
                        <td className="px-4 py-3 text-navy-mid">{eng.auditee_dept ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex rounded-[6px] px-[8px] py-[3px] text-[12px] font-medium', ENG_STATUS_BADGE[eng.status])}>
                            {AUDIT_ENGAGEMENT_STATUS_LABELS[eng.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-navy-mid text-[12px]">{eng.planned_start} – {eng.planned_end}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/audit/plans/${plan.id}/engagements/${eng.id}`}
                            className="text-[12px] font-medium text-gold hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
