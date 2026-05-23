import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, ClipboardList, Flame, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getAuditDashboardStats, listAuditFindings } from '@/lib/audit/queries'
import { AuditStatCard } from '@/components/audit/AuditStatCard'
import { AUDIT_FINDING_STATUS_BADGE } from '@/lib/audit/audit-utils'
import { AUDIT_FINDING_SEVERITY_LABELS, AUDIT_FINDING_STATUS_LABELS, type AuditFindingSeverity, type AuditFindingStatus } from '@/types/audit'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin',
  'ceo',
  'audit-officer',
  'risk-officer',
  'compliance-officer',
  'board-member',
  'dept-head',
]

type PreviewRow = {
  id: string
  finding_reference: string
  title: string
  severity: AuditFindingSeverity
  status: AuditFindingStatus
  due_date: string
}

export default async function AuditDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const [stats, findingsResult] = await Promise.all([
    getAuditDashboardStats(supabase),
    listAuditFindings(supabase),
  ])

  const preview = (findingsResult.data as unknown as PreviewRow[])
    .filter((row) => row.status !== 'closed')
    .slice(0, 5)

  const criticalOpen = stats.openBySeverity.critical

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Internal Audit</h1>
          <p className="mt-1 text-[14px] text-navy-mid">Open findings by severity and remediation status</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/audit/findings"
            className="inline-flex items-center rounded-[8px] border border-paper-border bg-white px-4 py-2 text-[14px] font-medium text-navy-900 hover:bg-paper"
          >
            View Findings
          </Link>
          <Link
            href="/audit/findings/new"
            className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
          >
            New Finding
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <AuditStatCard
          icon={ClipboardList}
          label="Open Findings"
          value={stats.totalOpen}
          accent="text-navy-900"
          description="All findings not yet closed"
        />
        <AuditStatCard
          icon={Flame}
          label="Critical Open"
          value={criticalOpen}
          accent={criticalOpen > 0 ? 'text-err' : 'text-ok'}
          description="Critical severity findings"
        />
        <AuditStatCard
          icon={AlertCircle}
          label="Overdue"
          value={stats.overdueCount}
          accent={stats.overdueCount > 0 ? 'text-err' : 'text-ok'}
          description="Past due and not closed"
        />
      </div>

      <div className="mb-6 rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <h2 className="mb-3 text-[16px] font-semibold text-navy-900">Open Findings by Severity</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(stats.openBySeverity) as AuditFindingSeverity[]).map((severity) => (
            <div key={severity} className="rounded-[8px] border border-paper-border bg-paper p-3">
              <p className="text-[12px] uppercase tracking-wider text-navy-mid">
                {AUDIT_FINDING_SEVERITY_LABELS[severity]}
              </p>
              <p className="mt-1 font-mono text-[24px] font-semibold text-navy-900">{stats.openBySeverity[severity]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Recent Open Findings</h2>
          <Link href="/audit/findings" className="text-[13px] text-navy-mid hover:text-navy-900 hover:underline">
            View all
          </Link>
        </div>

        {preview.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <ShieldCheck className="mb-4 h-10 w-10 text-paper-border" aria-hidden="true" />
            <h3 className="mb-2 text-[16px] font-semibold text-navy-900">No open findings</h3>
            <p className="mb-4 text-[14px] text-navy-mid">Audit queue is clear. Create a finding when a new issue is observed.</p>
            <Link
              href="/audit/findings/new"
              className="inline-flex items-center rounded-[8px] bg-gold px-8 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
            >
              New Finding
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-paper">
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Reference</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Title</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Severity</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Due</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((finding) => (
                  <tr key={finding.id} className="border-t border-paper-border hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-[14px] text-navy-mid">{finding.finding_reference}</td>
                    <td className="px-4 py-3">
                      <Link href={`/audit/findings/${finding.id}`} className="font-medium text-navy-900 hover:underline">
                        {finding.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{AUDIT_FINDING_SEVERITY_LABELS[finding.severity]}</td>
                    <td className="px-4 py-3 font-mono text-[14px] text-navy-mid">{finding.due_date}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex font-medium', AUDIT_FINDING_STATUS_BADGE[finding.status])}>
                        {AUDIT_FINDING_STATUS_LABELS[finding.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
