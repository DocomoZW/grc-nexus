// app/(protected)/dashboard/page.tsx
// Minimal Phase 1 dashboard — shows authenticated user's name, active role, institution.
// Full dashboard content delivered in Phase 2+.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signOut } from '@/lib/auth/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard — GRC-Nexus',
}

const ROLE_LABELS: Record<AppRole, string> = {
  'admin': 'Administrator',
  'board-member': 'Board Member',
  'ceo': 'Chief Executive Officer',
  'risk-officer': 'Risk Officer',
  'audit-officer': 'Audit Officer',
  'dept-head': 'Department Head',
}

const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  'admin': 'bg-navy-900 text-white border-navy-900',
  'board-member': 'bg-gold text-navy-950 border-gold',
  'ceo': 'bg-purple-700 text-white border-purple-700',
  'risk-officer': 'bg-orange-500 text-white border-orange-500',
  'audit-officer': 'bg-blue-700 text-white border-blue-700',
  'dept-head': 'bg-green-700 text-white border-green-700',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const appMeta = user.app_metadata as Record<string, unknown>
  const activeRole = appMeta?.active_role as AppRole | undefined
  const institutionId = appMeta?.institution_id as string | undefined

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Unknown User'

  // Fetch institution name
  let institutionName = 'Unknown Institution'
  if (institutionId) {
    const { data: institution } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', institutionId)
      .single()
    if (institution?.name) institutionName = institution.name
  }

  const badgeColor = activeRole ? ROLE_BADGE_COLORS[activeRole] : 'bg-gray-200 text-gray-600'
  const roleLabel = activeRole ? (ROLE_LABELS[activeRole] ?? activeRole) : 'No role assigned'

  return (
    <div className="min-h-screen bg-paper">
      {/* Top nav */}
      <header className="bg-navy-900 border-b border-navy-900/80 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-heading text-gold text-[20px] font-bold">GRC-Nexus</span>
          <span className="text-navy-mid text-[13px] font-body hidden sm:block">
            {institutionName}
          </span>
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-8 text-[13px] border-white/20 text-white hover:bg-white/10 hover:text-white"
          >
            Sign out
          </Button>
        </form>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome card */}
        <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-8 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-[14px] text-navy-mid font-body mb-1">Welcome back,</p>
              <h1 className="text-[28px] font-heading font-bold text-navy-900 leading-tight">
                {fullName}
              </h1>
              <p className="text-[14px] text-navy-mid font-body mt-1">{institutionName}</p>
            </div>
            {activeRole && (
              <Badge
                className={`text-[13px] font-semibold px-3 py-1 border ${badgeColor}`}
              >
                {roleLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* Phase 2+ placeholder */}
        <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-8 text-center">
          <div className="max-w-sm mx-auto">
            <div className="h-12 w-12 rounded-full bg-gold-pale flex items-center justify-center mx-auto mb-4">
              <span className="text-gold text-[20px]">2</span>
            </div>
            <h2 className="text-[18px] font-semibold text-navy-900 font-body mb-2">
              Dashboard content coming soon
            </h2>
            <p className="text-[14px] text-navy-mid font-body">
              Phase 2 will deliver the governance module dashboards — risk register, audit findings,
              board meetings, and performance scorecards.
            </p>
          </div>
        </div>

        {/* Admin quick links */}
        {activeRole === 'admin' && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/admin/users"
              className="bg-white rounded-[10px] border border-paper-border shadow-card p-5 hover:border-navy-mid/40 hover:shadow-auth transition-all group"
            >
              <h3 className="text-[15px] font-semibold text-navy-900 font-body group-hover:text-navy-950">
                User Management
              </h3>
              <p className="text-[13px] text-navy-mid font-body mt-1">
                Approve registrations, assign roles, manage accounts
              </p>
            </a>
            <a
              href="/admin/audit-log"
              className="bg-white rounded-[10px] border border-paper-border shadow-card p-5 hover:border-navy-mid/40 hover:shadow-auth transition-all group"
            >
              <h3 className="text-[15px] font-semibold text-navy-900 font-body group-hover:text-navy-950">
                Audit Log
              </h3>
              <p className="text-[13px] text-navy-mid font-body mt-1">
                View and export the immutable governance audit trail
              </p>
            </a>
          </div>
        )}

        {/* Audit officer quick link */}
        {activeRole === 'audit-officer' && (
          <div className="mt-6">
            <a
              href="/admin/audit-log"
              className="bg-white rounded-[10px] border border-paper-border shadow-card p-5 hover:border-navy-mid/40 hover:shadow-auth transition-all group block"
            >
              <h3 className="text-[15px] font-semibold text-navy-900 font-body group-hover:text-navy-950">
                Audit Log
              </h3>
              <p className="text-[13px] text-navy-mid font-body mt-1">
                View and export the immutable governance audit trail
              </p>
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
