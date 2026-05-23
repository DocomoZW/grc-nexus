// app/(protected)/dashboard/page.tsx
// Minimal Phase 1 dashboard — shows authenticated user's name, active role, institution.
// Full dashboard content delivered in Phase 2+.
// T-13: Adds MFA status display and regenerate backup codes button for admin/board-member.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/auth/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MFAStatusSection } from './MFAStatusSection'
import { ExecutiveFilterBar } from './ExecutiveFilterBar'
import { KpiSummaryCard } from './KpiSummaryCard'
import { OverdueActionsTable } from './OverdueActionsTable'
import { ExportGovernanceReportButton } from './ExportGovernanceReportButton'
import { getExecutiveDashboardData } from '@/lib/reporting/queries'
import type { AppRole } from '@/types/auth'
import { MFA_REQUIRED_ROLES } from '@/types/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard — GRC-Nexus',
}

const ROLE_LABELS: Record<AppRole, string> = {
  'admin': 'Administrator',
  'board-member': 'Board Member',
  'ceo': 'Chief Executive Officer',
  'risk-officer': 'Risk Officer',
  'audit-officer': 'Audit Officer',
  'compliance-officer': 'Compliance Officer',
  'dept-head': 'Department Head',
}

const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  'admin': 'bg-navy-900 text-white border-navy-900',
  'board-member': 'bg-gold text-navy-950 border-gold',
  'ceo': 'bg-purple-700 text-white border-purple-700',
  'risk-officer': 'bg-orange-500 text-white border-orange-500',
  'audit-officer': 'bg-blue-700 text-white border-blue-700',
  'compliance-officer': 'bg-teal-700 text-white border-teal-700',
  'dept-head': 'bg-green-700 text-white border-green-700',
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const appMeta = user.app_metadata as Record<string, unknown>
  const activeRole = appMeta?.active_role as AppRole | undefined
  const institutionId = appMeta?.institution_id as string | undefined

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Unknown User'

  // Fetch institution name
  let institutionName = 'Unknown Institution'
  if (institutionId) {
    const { data: institution } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', institutionId)
      .single()
    if (institution?.name) institutionName = institution.name
  }

  // Check MFA enrollment status for MFA-required roles
  const requiresMFA = activeRole ? MFA_REQUIRED_ROLES.includes(activeRole) : false
  let mfaEnrolled = false
  if (requiresMFA) {
    const { data: factors } = await supabase.auth.mfa.listFactors()
    mfaEnrolled = (factors?.all?.length ?? 0) > 0
  }

  const badgeColor = activeRole ? ROLE_BADGE_COLORS[activeRole] : 'bg-gray-200 text-gray-600'
  const roleLabel = activeRole ? (ROLE_LABELS[activeRole] ?? activeRole) : 'No role assigned'

  const executiveData = await getExecutiveDashboardData(supabase, {
    from: getSingleParam(searchParams.from),
    to: getSingleParam(searchParams.to),
    department: getSingleParam(searchParams.department),
    module: getSingleParam(searchParams.module),
  })

  const canExportGovernanceReport = activeRole
    ? ['admin', 'ceo', 'audit-officer'].includes(activeRole)
    : false

  return (
    <div className="min-h-screen bg-paper">
      {/* Top nav */}
      <header className="bg-navy-900 border-b border-navy-900/80 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-heading text-gold text-[20px] font-bold">GRC-Nexus</span>
          <span className="text-navy-mid text-[13px] font-body hidden sm:block">
            {institutionName}
          </span>
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-8 text-[13px] border-white/20 text-white hover:bg-white/10 hover:text-white"
          >
            Sign out
          </Button>
        </form>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome card */}
        <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-8 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-[14px] text-navy-mid font-body mb-1">Welcome back,</p>
              <h1 className="text-[28px] font-heading font-bold text-navy-900 leading-tight">
                {fullName}
              </h1>
              <p className="text-[14px] text-navy-mid font-body mt-1">{institutionName}</p>
            </div>
            {activeRole && (
              <Badge
                className={`text-[13px] font-semibold px-3 py-1 border ${badgeColor}`}
              >
                {roleLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* MFA status section for roles that require MFA */}
        {requiresMFA && (
          <MFAStatusSection mfaEnrolled={mfaEnrolled} />
        )}

        <div className="mb-3 flex items-start justify-between gap-3 flex-wrap">
          <ExecutiveFilterBar
            initialFrom={executiveData.filters.from}
            initialTo={executiveData.filters.to}
            initialDepartment={executiveData.filters.department ?? ''}
            initialModule={executiveData.filters.module}
          />
          <ExportGovernanceReportButton enabled={canExportGovernanceReport} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiSummaryCard
            title="Objectives"
            value={executiveData.kpi.objectivesTotal}
            subtitle="Strategic objectives in scope"
          />
          <KpiSummaryCard
            title="Active Risks"
            value={executiveData.kpi.activeRisks}
            subtitle="Open risk records"
          />
          <KpiSummaryCard
            title="Overdue Compliance"
            value={executiveData.kpi.overdueObligations}
            subtitle="Past due obligations"
          />
          <KpiSummaryCard
            title="Open Incidents"
            value={executiveData.kpi.openIncidents}
            subtitle="Cases not yet closed"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
            <h2 className="text-[16px] font-semibold text-navy-900 font-body">Risk Snapshot</h2>
            <p className="mt-1 text-[13px] text-navy-mid">
              {executiveData.riskHeatmapPoints.length.toLocaleString()} active risk points in current scope.
            </p>
            <p className="mt-3 text-[13px] text-navy-mid">
              Use the risk module heatmap for full visualization and drill-down by category.
            </p>
          </div>

          <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
            <h2 className="text-[16px] font-semibold text-navy-900 font-body">Compliance Posture</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[12px] text-navy-mid">Total</p>
                <p className="text-[20px] font-bold text-navy-900">{executiveData.compliance.totalObligations}</p>
              </div>
              <div>
                <p className="text-[12px] text-navy-mid">Overdue</p>
                <p className="text-[20px] font-bold text-orange-600">{executiveData.compliance.overdueCount}</p>
              </div>
              <div>
                <p className="text-[12px] text-navy-mid">Due Soon</p>
                <p className="text-[20px] font-bold text-blue-700">{executiveData.compliance.expiringCount}</p>
              </div>
            </div>
          </div>
        </div>

        <OverdueActionsTable rows={executiveData.overdueActions} />

        {/* Admin quick links */}
        {activeRole === 'admin' && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/admin/users"
              className="bg-white rounded-[10px] border border-paper-border shadow-card p-5 hover:border-navy-mid/40 hover:shadow-auth transition-all group"
            >
              <h3 className="text-[15px] font-semibold text-navy-900 font-body group-hover:text-navy-950">
                User Management
              </h3>
              <p className="text-[13px] text-navy-mid font-body mt-1">
                Approve registrations, assign roles, manage accounts
              </p>
            </a>
            <a
              href="/admin/audit-log"
              className="bg-white rounded-[10px] border border-paper-border shadow-card p-5 hover:border-navy-mid/40 hover:shadow-auth transition-all group"
            >
              <h3 className="text-[15px] font-semibold text-navy-900 font-body group-hover:text-navy-950">
                Audit Log
              </h3>
              <p className="text-[13px] text-navy-mid font-body mt-1">
                View and export the immutable governance audit trail
              </p>
            </a>
          </div>
        )}

        {/* Audit officer quick link */}
        {activeRole === 'audit-officer' && (
          <div className="mt-6">
            <a
              href="/admin/audit-log"
              className="bg-white rounded-[10px] border border-paper-border shadow-card p-5 hover:border-navy-mid/40 hover:shadow-auth transition-all group block"
            >
              <h3 className="text-[15px] font-semibold text-navy-900 font-body group-hover:text-navy-950">
                Audit Log
              </h3>
              <p className="text-[13px] text-navy-mid font-body mt-1">
                View and export the immutable governance audit trail
              </p>
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
