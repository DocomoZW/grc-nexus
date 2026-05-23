// app/(protected)/strategic/kpis/new/page.tsx
// Server Component shell — role-gated to admin/ceo/risk-officer (D-10, T-02-P06-01).
// Fetches active objectives for selector and user profiles for owner selector.
// SECURITY: force-dynamic prevents ISR caching; getUser() not getSession().
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiForm } from './KpiForm'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Create KPI — GRC-Nexus' }

const CREATE_KPI_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer']

export default async function NewKpiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !CREATE_KPI_ROLES.includes(activeRole)) {
    redirect('/strategic/objectives')
  }

  const [{ data: objectives }, { data: owners }] = await Promise.all([
    supabase.from('strategic_objectives').select('id, title').eq('status', 'active').order('title'),
    supabase.from('user_profiles').select('id, full_name').order('full_name'),
  ])

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900 font-body">Create KPI</h1>
        <p className="text-[14px] text-navy-mid mt-1">Define a KPI linked to a strategic objective</p>
      </div>
      <KpiForm objectives={objectives ?? []} owners={owners ?? []} />
    </div>
  )
}
