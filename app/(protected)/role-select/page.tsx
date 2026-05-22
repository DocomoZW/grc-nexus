// app/(protected)/role-select/page.tsx
// Role selection screen — shown when user has multiple assigned roles.
// If only 1 role: auto-selects and redirects to /dashboard.
// If 0 roles: redirects to /register/pending (no role assigned yet).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { selectRole } from '@/lib/auth/actions'
import { RoleSelectForm } from './RoleSelectForm'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Select Role — GRC-Nexus',
}

export default async function RoleSelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const appMeta = user.app_metadata as Record<string, unknown>
  const roles = (appMeta?.roles as AppRole[]) ?? []
  const activeRole = appMeta?.active_role as AppRole | undefined

  // No roles assigned yet — pending approval
  if (roles.length === 0) {
    redirect('/register/pending')
  }

  // Single role: auto-select and redirect (no need to show selection screen)
  if (roles.length === 1) {
    await selectRole(roles[0])
    // selectRole calls redirect() internally — this line is unreachable
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-navy-900 mb-4">
            <span className="font-heading text-gold text-[20px] font-bold">G</span>
          </div>
          <h1 className="text-[28px] font-heading font-bold text-navy-900 tracking-tight">
            GRC-Nexus
          </h1>
          <p className="text-[14px] text-navy-mid mt-1 font-body">
            Select your active role to continue
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[10px] border border-paper-border shadow-auth p-6">
          <RoleSelectForm roles={roles} activeRole={activeRole} />
        </div>
      </div>
    </div>
  )
}
