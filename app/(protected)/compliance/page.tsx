import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckSquare, AlertCircle, Clock, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getComplianceStats, listObligations } from '@/lib/compliance/queries'
import { computeCompliancePercentage, OBLIGATION_STATUS_BADGE } from '@/lib/compliance/compliance-utils'
import { ComplianceStatCard } from '@/components/compliance/ComplianceStatCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { RegulatoryFramework, ObligationStatus } from '@/types/compliance'
import { REGULATORY_FRAMEWORK_LABELS, OBLIGATION_STATUS_LABELS } from '@/types/compliance'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin',
  'ceo',
  'compliance-officer',
  'risk-officer',
  'audit-officer',
  'board-member',
]

type ObligationListRow = {
  id: string
  title: string
  framework: RegulatoryFramework
  due_date: string
  status: ObligationStatus
}

function FrameworkBadge({ framework }: { framework: RegulatoryFramework }) {
  const classes: Record<RegulatoryFramework, string> = {
    pecoga:    'bg-purple-50 text-purple-700 border border-purple-200',
    ppdpa:     'bg-blue-50 text-blue-700 border border-blue-200',
    nds2:      'bg-teal-50 text-teal-700 border border-teal-200',
    iso_37000: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    king_iv:   'bg-amber-50 text-amber-700 border border-amber-200',
    ipsas:     'bg-cyan-50 text-cyan-700 border border-cyan-200',
    pfma:      'bg-orange-50 text-orange-700 border border-orange-200',
    other:     'bg-gray-100 text-gray-600 border border-gray-300',
  }
  return (
    <span className={cn(
      'inline-flex rounded-[6px] px-[8px] py-[4px] text-[14px] font-medium',
      classes[framework]
    )}>
      {REGULATORY_FRAMEWORK_LABELS[framework]}
    </span>
  )
}

export default async function ComplianceDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const [stats, obligationsResult] = await Promise.all([
    getComplianceStats(supabase),
    listObligations(supabase),
  ])

  const obligationsWithStatus = stats.obligations as unknown as { status: ObligationStatus }[]
  const compliancePercent = computeCompliancePercentage(obligationsWithStatus)
  const totalActive = obligationsWithStatus.filter((o) => o.status !== 'waived').length
  const compliantCount = obligationsWithStatus.filter((o) => o.status === 'compliant').length

  // Stat card color semantics (UI-SPEC)
  const complianceAccent = compliancePercent >= 80 ? 'text-ok' : compliancePercent >= 50 ? 'text-warn' : 'text-err'
  const overdueAccent = stats.overdueCount > 0 ? 'text-err' : 'text-ok'
  const expiringAccent = stats.expiringCount > 0 ? 'text-warn' : 'text-ok'

  // Preview table: last 5 obligations (slice)
  const allObligations = obligationsResult.data as unknown as ObligationListRow[]
  const previewObligations = allObligations.slice(0, 5)
  const isEmpty = allObligations.length === 0

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Compliance Management</h1>
          <p className="mt-1 text-[14px] text-navy-mid">Track regulatory obligations, evidence, and compliance posture</p>
        </div>
        <Link
          href="/compliance/obligations/new"
          className="inline-flex items-center rounded-[8px] bg-gold px-8 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
        >
          Add Obligation
        </Link>
      </div>

      {/* Overdue alert banner */}
      {stats.overdueCount > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Action Required — {stats.overdueCount} Overdue Obligation(s)</AlertTitle>
          <AlertDescription>
            You have overdue compliance obligations requiring immediate attention.{' '}
            <Link href="/compliance/obligations?status=overdue" className="underline hover:no-underline">
              View overdue obligations
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ComplianceStatCard
          icon={CheckSquare}
          label="Compliance Rate"
          value={`${compliancePercent}%`}
          accent={complianceAccent}
          description={`${compliantCount} of ${totalActive} obligations met`}
        />
        <ComplianceStatCard
          icon={AlertCircle}
          label="Overdue"
          value={stats.overdueCount}
          accent={overdueAccent}
          description="Past due date, not compliant"
        />
        <ComplianceStatCard
          icon={Clock}
          label="Expiring Soon"
          value={stats.expiringCount}
          accent={expiringAccent}
          description="Due within the next 30 days"
        />
      </div>

      {/* Obligations preview table */}
      <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Obligations</h2>
          <Link
            href="/compliance/obligations"
            className="text-[13px] text-navy-mid hover:text-navy-900 hover:underline"
          >
            View all obligations
          </Link>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="mb-4 h-10 w-10 text-paper-border" aria-hidden="true" />
            <h3 className="mb-2 text-[16px] font-semibold text-navy-900">No obligations recorded</h3>
            <p className="mb-4 text-[14px] text-navy-mid">
              Start by adding your first regulatory obligation to track compliance.
            </p>
            <Link
              href="/compliance/obligations/new"
              className="inline-flex items-center rounded-[8px] bg-gold px-8 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
            >
              Add Obligation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-paper">
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Title</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Framework</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Due Date</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewObligations.map((obligation) => (
                  <tr key={obligation.id} className="border-t border-paper-border hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/compliance/obligations/${obligation.id}`}
                        className="font-medium text-navy-900 hover:underline"
                      >
                        {obligation.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <FrameworkBadge framework={obligation.framework} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[14px] text-navy-mid">{obligation.due_date}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex font-medium', OBLIGATION_STATUS_BADGE[obligation.status])}>
                        {OBLIGATION_STATUS_LABELS[obligation.status]}
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
