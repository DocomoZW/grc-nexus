import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listIncidentCases } from '@/lib/incidents/queries'
import { IncidentCasesTable } from './IncidentCasesTable'

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

export default async function IncidentCasesPage() {
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

  const { data } = await listIncidentCases(supabase)

  const rows = (data as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    case_reference: (row.case_reference as string | undefined) ?? String(row.id).slice(0, 8).toUpperCase(),
    title: row.title as string,
    category: row.category as 'fraud' | 'misconduct' | 'safety' | 'cyber' | 'governance' | 'other',
    status: row.status as 'new' | 'assigned' | 'in_investigation' | 'escalated' | 'closed',
    severity: row.severity as 'low' | 'medium' | 'high' | 'critical',
    is_anonymous: Boolean(row.is_anonymous),
    assigned_investigator_id: (row.assigned_investigator_id as string | null) ?? null,
    assigned_investigator_name:
      [
        (row as { user_profiles?: { first_name?: string | null; last_name?: string | null } }).user_profiles?.first_name,
        (row as { user_profiles?: { first_name?: string | null; last_name?: string | null } }).user_profiles?.last_name,
      ]
        .filter(Boolean)
        .join(' ') || 'Unassigned',
    sla_due_date: (row.sla_due_date as string | null) ?? null,
    created_at: row.created_at as string,
  }))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Incident Cases</h1>
          <p className="mt-1 text-[14px] text-navy-mid">{rows.length} cases in your scoped incident queue</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/incidents"
            className="inline-flex items-center rounded-[8px] border border-paper-border bg-white px-4 py-2 text-[14px] font-medium text-navy-900 hover:bg-paper"
          >
            Dashboard
          </Link>
          <Link
            href="/incidents/report"
            className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
          >
            New Report
          </Link>
        </div>
      </div>

      <IncidentCasesTable rows={rows} />
    </div>
  )
}
