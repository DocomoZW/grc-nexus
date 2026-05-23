// app/(protected)/strategic/objectives/new/page.tsx
// Server Component shell — role-gated to admin/ceo only (D-07, T-02-P04-01).
// Non-admin/non-CEO users are redirected to the objectives list.
// SECURITY: force-dynamic prevents ISR caching; getUser() not getSession().
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ObjectiveForm } from './ObjectiveForm'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New Objective — GRC-Nexus' }

const CREATE_ROLES: AppRole[] = ['admin', 'ceo']

export default async function NewObjectivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  // Role-gate: only admin and ceo may create objectives (T-02-P04-01)
  if (!activeRole || !CREATE_ROLES.includes(activeRole)) {
    redirect('/strategic/objectives')
  }

  // Fetch user profiles for owner selector — RLS scopes to institution_id (T-02-P04-04)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .order('full_name')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900 font-body">New Strategic Objective</h1>
        <p className="text-[14px] text-navy-mid mt-1">Create a new NDS2-aligned or institutional objective</p>
      </div>
      <ObjectiveForm owners={profiles ?? []} />
    </div>
  )
}
