import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, ShieldCheck, Timer } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getIncidentDashboardStats, listIncidentCases } from '@/lib/incidents/queries'
import { INCIDENT_STATUS_LABELS, type IncidentCaseRow, type IncidentStatus } from '@/types/incidents'
import { IncidentCategoryBadge } from '@/components/incidents/IncidentCategoryBadge'
import { cn } from '@/lib/utils'

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

const STATUS_BADGE: Record<IncidentStatus, string> = {
  new: 'bg-paper text-navy-mid border-paper-border',
  assigned: 'bg-blue-50 text-blue-700 border-blue-200',
  in_investigation: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  escalated: 'bg-err/10 text-err border-err/30',
  closed: 'bg-ok/10 text-ok border-ok/30',
}

export default async function IncidentsDashboardPage() {
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

  const [stats, listResult] = await Promise.all([
    getIncidentDashboardStats(supabase),
    listIncidentCases(supabase),
  ])

  const openRows = (listResult.data as unknown as IncidentCaseRow[])
    .filter((row) => row.status !== 'closed')
    .slice(0, 5)

  const byStatus = (stats.cases as Array<{ status: IncidentStatus }>).reduce(
    (acc, row) => {
      acc[row.status] += 1
      return acc
    },
    { new: 0, assigned: 0, in_investigation: 0, escalated: 0, closed: 0 } as Record<IncidentStatus, number>,
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Incident Management</h1>
          <p className="mt-1 text-[14px] text-navy-mid">Live incident posture, assignment, and escalation overview</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/incidents/cases"
            className="inline-flex items-center rounded-[8px] border border-paper-border bg-white px-4 py-2 text-[14px] font-medium text-navy-900 hover:bg-paper"
          >
            View Cases
          </Link>
          <Link
            href="/incidents/report"
            className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
          >
            New Report
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
          <p className="text-[12px] uppercase tracking-wider text-navy-mid">Open Cases</p>
          <p className="mt-1 text-[28px] font-semibold text-navy-900">{stats.cases.length - byStatus.closed}</p>
          <p className="mt-1 text-[13px] text-navy-mid">Cases not yet closed</p>
        </div>
        <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
          <p className="text-[12px] uppercase tracking-wider text-navy-mid">Escalated</p>
          <p className={cn('mt-1 text-[28px] font-semibold', stats.escalatedCount > 0 ? 'text-err' : 'text-navy-900')}>
            {stats.escalatedCount}
          </p>
          <p className="mt-1 text-[13px] text-navy-mid">Active escalations</p>
        </div>
        <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
          <p className="text-[12px] uppercase tracking-wider text-navy-mid">Overdue SLA</p>
          <p className={cn('mt-1 text-[28px] font-semibold', stats.overdueCount > 0 ? 'text-err' : 'text-navy-900')}>
            {stats.overdueCount}
          </p>
          <p className="mt-1 text-[13px] text-navy-mid">Cases past due date</p>
        </div>
      </div>

      <div className="mb-6 rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <h2 className="mb-3 text-[16px] font-semibold text-navy-900">Status Distribution</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {(Object.keys(byStatus) as IncidentStatus[]).map((status) => (
            <div key={status} className="rounded-[8px] border border-paper-border bg-paper p-3">
              <p className="text-[12px] uppercase tracking-wider text-navy-mid">{INCIDENT_STATUS_LABELS[status]}</p>
              <p className="mt-1 font-mono text-[24px] font-semibold text-navy-900">{byStatus[status]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Recent Active Cases</h2>
          <Link href="/incidents/cases" className="text-[13px] text-navy-mid hover:text-navy-900 hover:underline">
            View all
          </Link>
        </div>

        {openRows.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <ShieldCheck className="mb-3 h-10 w-10 text-paper-border" aria-hidden="true" />
            <p className="text-[14px] text-navy-mid">No active incidents right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-paper">
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Case</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Title</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Category</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Status</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">SLA</th>
                </tr>
              </thead>
              <tbody>
                {openRows.map((item) => {
                  const slaOverdue = Boolean(item.sla_due_date && new Date(item.sla_due_date) < new Date())
                  return (
                    <tr key={item.id} className="border-t border-paper-border hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-[14px] text-navy-mid">{item.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3">
                        <Link href={`/incidents/cases/${item.id}`} className="font-medium text-navy-900 hover:underline">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <IncidentCategoryBadge category={item.category} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-[6px] border px-[8px] py-[4px] text-[13px] font-medium', STATUS_BADGE[item.status])}>
                          {INCIDENT_STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 text-[13px]', slaOverdue ? 'font-semibold text-err' : 'text-navy-mid')}>
                          <Timer className="h-3 w-3" aria-hidden="true" />
                          {item.sla_due_date ? new Date(item.sla_due_date).toISOString().slice(0, 10) : 'N/A'}
                        </span>
                        {slaOverdue && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[12px] text-err">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Overdue
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
