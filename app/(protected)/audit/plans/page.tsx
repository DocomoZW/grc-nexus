// app/(protected)/audit/plans/page.tsx
// Audit Plans list — Server Component.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listAuditPlans } from '@/lib/audit/universe-queries'
import { AUDIT_PLAN_STATUS_LABELS, type AuditPlanStatus } from '@/types/audit-universe'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audit Plans — GRC-Nexus' }

const VIEW_ROLES: AppRole[] = [
  'admin', 'ceo', 'audit-officer', 'risk-officer', 'compliance-officer', 'board-member', 'dept-head',
]
const CREATE_ROLES: AppRole[] = ['admin', 'audit-officer']

const STATUS_BADGE: Record<AuditPlanStatus, string> = {
  draft:       'bg-paper text-navy-mid border border-paper-border',
  approved:    'bg-teal-50 text-teal-700 border border-teal-200',
  in_progress: 'bg-warn/10 text-warn border border-warn/30',
  completed:   'bg-ok/10 text-ok border border-ok/30',
  cancelled:   'bg-err/10 text-err border border-err/30',
}

type PlanRow = {
  id: string
  title: string
  plan_year: number
  status: AuditPlanStatus
  created_at: string
}

export default async function AuditPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const { data } = await listAuditPlans(supabase)
  const rows = data as unknown as PlanRow[]
  const canCreate = CREATE_ROLES.includes(activeRole)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Audit Plans</h1>
          <p className="mt-1 text-[14px] text-navy-mid">{rows.length} plan{rows.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Link
            href="/audit/plans/new"
            className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[13px] font-medium text-navy-950 hover:bg-gold-hi"
          >
            New Plan
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-paper-border bg-paper p-12 text-center">
          <p className="text-[14px] text-navy-mid">No audit plans created yet.</p>
          {canCreate && (
            <Link href="/audit/plans/new" className="mt-3 inline-block text-[13px] font-medium text-gold hover:underline">
              Create the first audit plan →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-paper-border bg-white shadow-card">
          <table className="w-full text-[13px]">
            <thead className="border-b border-paper-border bg-paper text-[12px] font-medium uppercase tracking-wide text-navy-mid">
              <tr>
                <th className="px-4 py-3 text-left">Year</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {rows.map((plan) => (
                <tr key={plan.id} className="hover:bg-paper/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[14px] font-semibold text-navy-900">{plan.plan_year}</td>
                  <td className="px-4 py-3 font-medium text-navy-900 max-w-[320px] truncate">{plan.title}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-[6px] px-[8px] py-[3px] text-[12px] font-medium', STATUS_BADGE[plan.status])}>
                      {AUDIT_PLAN_STATUS_LABELS[plan.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-navy-mid">{plan.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/audit/plans/${plan.id}`} className="text-[12px] font-medium text-gold hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
