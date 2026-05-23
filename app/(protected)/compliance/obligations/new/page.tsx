import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { ObligationForm } from './ObligationForm'

export const dynamic = 'force-dynamic'

const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer']

type UserProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
}

export default async function NewObligationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !WRITE_ROLES.includes(activeRole)) {
    redirect('/compliance/obligations')
  }

  // Fetch institution members for the owner dropdown
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .order('first_name', { ascending: true })

  const typedProfiles = (profiles ?? []) as unknown as UserProfileRow[]

  const users = typedProfiles.map((profile) => ({
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900">New Obligation</h1>
        <p className="mt-1 text-[14px] text-navy-mid">
          Create a regulatory compliance obligation for your institution.
        </p>
      </div>

      <ObligationForm users={users} />
    </div>
  )
}
