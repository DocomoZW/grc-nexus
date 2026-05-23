import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listObligations } from '@/lib/compliance/queries'
import { ObligationsTable } from './ObligationsTable'
import type { RegulatoryFramework, ObligationStatus } from '@/types/compliance'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin',
  'ceo',
  'compliance-officer',
  'risk-officer',
  'audit-officer',
  'board-member',
]

type ObligationsListRow = {
  id: string
  framework: RegulatoryFramework
  framework_reference: string | null
  title: string
  owner_id: string | null
  due_date: string
  status: ObligationStatus
  created_at: string
  user_profiles: { first_name: string | null; last_name: string | null } | null
}

export default async function ObligationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const { data: rows } = await listObligations(supabase)
  const typedRows = rows as unknown as ObligationsListRow[]

  // Normalize rows: compute owner_name from user_profiles join
  const normalizedRows = typedRows.map((row) => {
    const owner = row.user_profiles
    return {
      id: row.id,
      framework: row.framework,
      framework_reference: row.framework_reference,
      title: row.title,
      owner_id: row.owner_id ?? 'unassigned',
      owner_name: [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || 'Unassigned',
      due_date: row.due_date,
      status: row.status,
      evidence_count: 0, // evidence_count is not included in listObligations — default to 0 for list view
      created_at: row.created_at,
    }
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Obligations Register</h1>
          <p className="mt-1 text-[14px] text-navy-mid">{normalizedRows.length} obligations total</p>
        </div>
        <Link
          href="/compliance/obligations/new"
          className="inline-flex items-center rounded-[8px] bg-gold px-8 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
        >
          Add Obligation
        </Link>
      </div>

      <ObligationsTable rows={normalizedRows} />
    </div>
  )
}
