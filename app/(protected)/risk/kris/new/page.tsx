// app/(protected)/risk/kris/new/page.tsx
// Server Component shell — role-gated to admin/ceo/risk-officer.
// Fetches risks and user_profiles for selector dropdowns.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KriForm } from './KriForm'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Create KRI — GRC-Nexus' }

const CREATE_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer']

type RiskOption  = { id: string; title: string }
type OwnerOption = { id: string; first_name: string | null; last_name: string | null }

export default async function NewKriPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !CREATE_ROLES.includes(activeRole)) redirect('/risk/kris')

  const [{ data: risks }, { data: owners }] = await Promise.all([
    supabase.from('risks').select('id, title').order('title'),
    supabase.from('user_profiles').select('id, first_name, last_name').order('last_name'),
  ])

  const riskOptions  = (risks  ?? []) as unknown as RiskOption[]
  const ownerOptions = (owners ?? []) as unknown as OwnerOption[]

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900 font-body">Create KRI</h1>
        <p className="text-[14px] text-navy-mid mt-1">Define a Key Risk Indicator linked to a risk</p>
      </div>
      <KriForm risks={riskOptions} owners={ownerOptions} />
    </div>
  )
}
