// app/(protected)/audit/kcis/new/page.tsx
// Server Component shell — role-gated to admin/audit-officer.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KciForm } from './KciForm'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Create KCI — GRC-Nexus' }

const CREATE_ROLES: AppRole[] = ['admin', 'audit-officer']

type TreatmentOption = { id: string; title: string }
type OwnerOption     = { id: string; first_name: string | null; last_name: string | null }

export default async function NewKciPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !CREATE_ROLES.includes(activeRole)) redirect('/audit/kcis')

  const [{ data: treatments }, { data: owners }] = await Promise.all([
    supabase.from('risk_treatments').select('id, title').order('title'),
    supabase.from('user_profiles').select('id, first_name, last_name').order('last_name'),
  ])

  const treatmentOptions = (treatments ?? []) as unknown as TreatmentOption[]
  const ownerOptions     = (owners     ?? []) as unknown as OwnerOption[]

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900 font-body">Create KCI</h1>
        <p className="text-[14px] text-navy-mid mt-1">Define a Key Control Indicator linked to a risk treatment</p>
      </div>
      <KciForm treatments={treatmentOptions} owners={ownerOptions} />
    </div>
  )
}
