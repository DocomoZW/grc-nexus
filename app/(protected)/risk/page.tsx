import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listRisks, listRiskHeatmapPoints } from '@/lib/risk/queries'
import { calculateRiskScore, getRiskSeverity, isTreatmentOverdue } from '@/lib/risk/risk-utils'
import { getKriDashboardStats } from '@/lib/risk/kri-queries'
import { RiskHeatmap } from './RiskHeatmap'
import type { RiskStatus, TreatmentStatus } from '@/types/risk'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin',
  'ceo',
  'risk-officer',
  'audit-officer',
  'board-member',
  'dept-head',
]

type RiskOverviewRow = {
  inherent_likelihood: number
  inherent_impact: number
  risk_treatments: Array<{ status: TreatmentStatus }> | null
}

type HeatmapPoint = {
  id: string
  title: string
  status: RiskStatus
  inherent_likelihood: number
  inherent_impact: number
}

export default async function RiskOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const [risksResult, heatmapResult, kriStats] = await Promise.all([
    listRisks(supabase),
    listRiskHeatmapPoints(supabase),
    getKriDashboardStats(supabase),
  ])

  const rows = risksResult.data as unknown as RiskOverviewRow[]
  const heatmapPoints = heatmapResult.data as unknown as HeatmapPoint[]

  const criticalRisks = rows.filter((risk) => getRiskSeverity(calculateRiskScore(risk.inherent_likelihood, risk.inherent_impact)) === 'critical').length
  const highRisks = rows.filter((risk) => getRiskSeverity(calculateRiskScore(risk.inherent_likelihood, risk.inherent_impact)) === 'high').length
  const openTreatments = rows.reduce((sum, risk) => sum + (risk.risk_treatments ?? []).filter((treatment) => treatment.status !== 'completed' && treatment.status !== 'cancelled').length, 0)
  const overdueTreatments = rows.reduce((sum, risk) => sum + (risk.risk_treatments ?? []).filter((treatment) => isTreatmentOverdue(treatment.status, new Date())).length, 0)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Risk Management</h1>
          <p className="mt-1 text-[14px] text-navy-mid">Enterprise risk register and heatmap</p>
        </div>
        <Link
          href="/risk/new"
          className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[13px] font-medium text-navy-950 hover:bg-gold-hi"
        >
          Add Risk
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Critical Risks" value={criticalRisks} accent="text-err" />
        <StatCard label="High Risks" value={highRisks} accent="text-warn" />
        <StatCard label="Open Treatments" value={openTreatments} accent="text-navy-900" />
        <StatCard label="Overdue Treatments" value={overdueTreatments} accent="text-err" />
      </div>

      <div className="mb-6 rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Heatmap Preview</h2>
          <Link href="/risk/heatmap" className="text-[13px] text-navy-mid hover:text-navy-900 hover:underline">
            View full heatmap
          </Link>
        </div>
        <RiskHeatmap points={heatmapPoints} cellSize={48} />
      </div>

      <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Quick Links</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/risk/register" className="rounded-[8px] border border-paper-border px-4 py-2 text-[13px] text-navy-900 hover:bg-paper">
            Open Register
          </Link>
          <Link href="/risk/heatmap" className="rounded-[8px] border border-paper-border px-4 py-2 text-[13px] text-navy-900 hover:bg-paper">
            Open Heatmap
          </Link>
          <Link href="/risk/new" className="rounded-[8px] border border-paper-border px-4 py-2 text-[13px] text-navy-900 hover:bg-paper">
            Create Risk
          </Link>
        </div>
      </div>

      {/* KRI summary */}
      <div className="mt-4 rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Key Risk Indicators</h2>
          <Link href="/risk/kris" className="text-[13px] text-navy-mid hover:text-navy-900 hover:underline">
            View all KRIs →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-[8px] border border-paper-border bg-paper p-3">
            <p className="text-[12px] uppercase tracking-wider text-navy-mid">On Track</p>
            <p className="mt-1 font-mono text-[24px] font-semibold text-ok">{kriStats.on_track}</p>
          </div>
          <div className="rounded-[8px] border border-paper-border bg-paper p-3">
            <p className="text-[12px] uppercase tracking-wider text-navy-mid">At Risk</p>
            <p className="mt-1 font-mono text-[24px] font-semibold text-warn">{kriStats.at_risk}</p>
          </div>
          <div className="rounded-[8px] border border-paper-border bg-paper p-3">
            <p className="text-[12px] uppercase tracking-wider text-navy-mid">Breached</p>
            <p className={`mt-1 font-mono text-[24px] font-semibold ${kriStats.breached > 0 ? 'text-err' : 'text-navy-900'}`}>{kriStats.breached}</p>
          </div>
          <div className="rounded-[8px] border border-paper-border bg-paper p-3">
            <p className="text-[12px] uppercase tracking-wider text-navy-mid">No Data</p>
            <p className="mt-1 font-mono text-[24px] font-semibold text-navy-mid">{kriStats.no_data}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-[10px] border border-paper-border bg-white p-4 shadow-card">
      <p className="text-[12px] uppercase tracking-wider text-navy-mid">{label}</p>
      <p className={`mt-2 font-mono text-[28px] font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
