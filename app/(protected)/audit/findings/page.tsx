import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listAuditFindings, type AuditFindingListRow } from '@/lib/audit/queries'
import { AuditFindingsTable } from './AuditFindingsTable'

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

export default async function AuditFindingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const { data } = await listAuditFindings(supabase)
  const rows = (data as unknown as AuditFindingListRow[]).map((row) => ({
    id: row.id,
    finding_reference: row.finding_reference,
    title: row.title,
    severity: row.severity,
    status: row.status,
    remediation_owner_id: row.remediation_owner_id ?? 'unassigned',
    remediation_owner_name:
      [row.user_profiles?.first_name, row.user_profiles?.last_name].filter(Boolean).join(' ') || 'Unassigned',
    due_date: row.due_date,
    review_date: row.review_date,
    linked_entity_type: row.linked_entity_type,
    linked_entity_id: row.linked_entity_id,
    created_at: row.created_at,
  }))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Audit Findings</h1>
          <p className="mt-1 text-[14px] text-navy-mid">{rows.length} findings total</p>
        </div>
        <Link
          href="/audit/findings/new"
          className="inline-flex items-center rounded-[8px] bg-gold px-8 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
        >
          New Finding
        </Link>
      </div>

      <AuditFindingsTable rows={rows} />
    </div>
  )
}
