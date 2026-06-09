export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getPecgComplianceScore, listPecgComplianceChecks, listPecgRules } from '@/lib/compliance/pecg-queries'
import { ComplianceStatCard } from '@/components/compliance/ComplianceStatCard'
import { Shield, Gavel, CheckSquare, AlertCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PECGComplianceCheck, PECGComplianceScore, PECGComplianceRule } from '@/types/compliance'
import { PECG_CHECK_STATUS_BADGE, PECG_CHECK_STATUS_LABELS, PECG_RISK_LEVEL_BADGE, PECG_RISK_LEVEL_LABELS } from '@/types/compliance'

const VIEW_ROLES: AppRole[] = [
  'admin',
  'ceo',
  'compliance-officer',
  'risk-officer',
  'audit-officer',
  'board-member',
]

export default async function PECGCompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const [scoreResult, checksResult, rulesResult] = await Promise.all([
    getPecgComplianceScore(supabase),
    listPecgComplianceChecks(supabase),
    listPecgRules(supabase),
  ])

  const score = scoreResult as PECGComplianceScore | null
  const checks = checksResult as PECGComplianceCheck[]
  const rules = rulesResult.data as PECGComplianceRule[]

  const nonCompliantChecks = checks.filter((c) => c.status === 'non_compliant')
  const atRiskChecks = checks.filter((c) => c.status === 'at_risk')
  const pecgChecks = checks.filter((c) => c.regulation === 'PECG_ACT')
  const zimcodeChecks = checks.filter((c) => c.regulation === 'ZIMCODE')

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/compliance" className="mb-2 inline-flex items-center text-[13px] text-navy-mid hover:text-navy-900">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Compliance
          </Link>
          <h1 className="text-[20px] font-semibold text-navy-900">PECG Act & ZimCode Compliance</h1>
          <p className="mt-1 text-[14px] text-navy-mid">
            Automated compliance monitoring against the Public Entities Corporate Governance Act and Zimbabwe National Code on Corporate Governance
          </p>
        </div>
      </div>

      {/* Score Cards */}
      {score && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <ComplianceStatCard
            icon={Shield}
            label="Overall Score"
            value={`${score.overall_score}%`}
            accent={score.overall_score >= 80 ? 'text-ok' : score.overall_score >= 50 ? 'text-warn' : 'text-err'}
            description={`${score.compliant_count} of ${score.check_count} checks passed`}
          />
          <ComplianceStatCard
            icon={Gavel}
            label="PECG Act Score"
            value={`${score.pecg_act_score}%`}
            accent={score.pecg_act_score >= 80 ? 'text-ok' : score.pecg_act_score >= 50 ? 'text-warn' : 'text-err'}
            description={`${pecgChecks.filter(c => c.status === 'compliant').length} compliant`}
          />
          <ComplianceStatCard
            icon={CheckSquare}
            label="ZimCode Score"
            value={`${score.zimcode_score}%`}
            accent={score.zimcode_score >= 80 ? 'text-ok' : score.zimcode_score >= 50 ? 'text-warn' : 'text-err'}
            description={`${zimcodeChecks.filter(c => c.status === 'compliant').length} compliant`}
          />
          <ComplianceStatCard
            icon={AlertCircle}
            label="Risk Level"
            value={score.risk_level.toUpperCase()}
            accent={
              score.risk_level === 'low' ? 'text-ok' :
              score.risk_level === 'medium' ? 'text-warn' :
              score.risk_level === 'high' ? 'text-err' : 'text-err'
            }
            description={`${score.non_compliant_count} critical, ${score.at_risk_count} at-risk`}
          />
        </div>
      )}

      {/* Critical Violations Alert */}
      {nonCompliantChecks.length > 0 && (
        <div className="mb-6 rounded-[10px] border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 text-[16px] font-semibold text-red-800">
            {nonCompliantChecks.length} Critical Violation(s) Detected
          </h3>
          <ul className="space-y-1">
            {nonCompliantChecks.slice(0, 5).map((check) => (
              <li key={check.id} className="text-[14px] text-red-700">
                • {check.rule_name} ({check.regulation})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Compliance Checks Table */}
      <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Compliance Checks</h2>
          <span className="text-[13px] text-navy-mid">{checks.length} total checks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-paper">
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Rule</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Regulation</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Status</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Severity</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Checked</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.id} className="border-t border-paper-border hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-navy-900">{check.rule_name}</span>
                    <span className="ml-2 text-[12px] text-navy-mid">{check.rule_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex rounded-[6px] px-[8px] py-[4px] text-[14px] font-medium',
                      check.regulation === 'PECG_ACT'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-teal-50 text-teal-700 border border-teal-200'
                    )}>
                      {check.regulation}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex font-medium', PECG_CHECK_STATUS_BADGE[check.status])}>
                      {PECG_CHECK_STATUS_LABELS[check.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex rounded-[6px] px-[8px] py-[4px] text-[14px] font-medium',
                      check.severity === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                      check.severity === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      check.severity === 'legal' ? 'bg-red-100 text-red-800 border border-red-300 font-semibold' :
                      'bg-gray-50 text-gray-600 border border-gray-200'
                    )}>
                      {check.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[14px] text-navy-mid">
                      {new Date(check.checked_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules Reference */}
      <div className="mt-6 rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-4">
          <h2 className="text-[16px] font-semibold text-navy-900">Compliance Rules Reference</h2>
          <p className="mt-1 text-[14px] text-navy-mid">All active PECG Act and ZimCode rules monitored by the system</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-paper">
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Code</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Name</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Regulation</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Section</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">Severity</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-t border-paper-border hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-[14px] text-navy-mid">{rule.rule_code}</td>
                  <td className="px-4 py-3 font-medium text-navy-900">{rule.rule_name}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex rounded-[6px] px-[8px] py-[4px] text-[14px] font-medium',
                      rule.regulation === 'PECG_ACT'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-teal-50 text-teal-700 border border-teal-200'
                    )}>
                      {rule.regulation}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[14px] text-navy-mid">{rule.section_ref}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex rounded-[6px] px-[8px] py-[4px] text-[14px] font-medium',
                      rule.severity === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                      rule.severity === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      rule.severity === 'legal' ? 'bg-red-100 text-red-800 border border-red-300 font-semibold' :
                      'bg-gray-50 text-gray-600 border border-gray-200'
                    )}>
                      {rule.severity.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
