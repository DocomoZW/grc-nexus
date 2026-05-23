// app/(protected)/strategic/objectives/[id]/edit/page.tsx
// Server Component shell — role-gated to admin/ceo only.
// Fetches the objective by id and passes to ObjectiveEditForm.
// SECURITY: force-dynamic; getUser() not getSession(); RLS enforces institution_id scoping.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ObjectiveEditForm } from './ObjectiveEditForm'
import type { AppRole } from '@/types/auth'
import type { StrategicObjective } from '@/types/strategic'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Edit Objective — GRC-Nexus' }

const EDIT_ROLES: AppRole[] = ['admin', 'ceo']

interface PageProps {
  params: { id: string }
}

export default async function EditObjectivePage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  // Role-gate: only admin and ceo may edit objectives
  if (!activeRole || !EDIT_ROLES.includes(activeRole)) {
    redirect(`/strategic/objectives/${params.id}`)
  }

  // Fetch objective — RLS ensures it belongs to user's institution
  const { data: objective } = await supabase
    .from('strategic_objectives')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!objective) {
    redirect('/strategic/objectives')
  }

  // Fetch user profiles for owner selector — RLS scopes to institution_id
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .order('full_name')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900 font-body">Edit Objective</h1>
        <p className="text-[14px] text-navy-mid mt-1">{objective.title}</p>
      </div>
      <ObjectiveEditForm
        objective={objective as StrategicObjective}
        owners={profiles ?? []}
      />
    </div>
  )
}
