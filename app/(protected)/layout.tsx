// app/(protected)/layout.tsx
// Auth-gated layout — defense-in-depth auth check (middleware also checks, this is second layer).
// SECURITY: Uses getUser() — NOT getSession() (getSession() does not validate JWT).
// SECURITY: force-dynamic prevents ISR caching of authenticated responses.
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // Re-validate here even though middleware also checks — defense-in-depth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Users with 'pending' status cannot access protected pages
  const appMeta = user.app_metadata as Record<string, string>
  if (appMeta?.status === 'pending') {
    redirect('/register/pending')
  }

  const activeRole = appMeta?.active_role

  return (
    <div className="min-h-screen bg-paper">
      {/* Sidebar navigation */}
      <nav className="fixed left-0 top-0 h-full w-[220px] bg-white border-r border-paper-border flex flex-col px-4 py-6 shadow-card z-10">
        <div className="mb-8">
          <span className="font-heading text-[18px] font-bold text-navy-950">GRC-Nexus</span>
        </div>
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="px-3 py-2 rounded-[6px] text-[14px] font-medium text-navy-900 hover:bg-paper transition-colors"
          >
            Dashboard
          </Link>
          {/* Strategic — visible to ALL authenticated roles (D-27) */}
          <Link
            href="/strategic/objectives"
            className="px-3 py-2 rounded-[6px] text-[14px] font-medium text-navy-900 hover:bg-paper transition-colors"
          >
            Strategic
          </Link>
          <Link
            href="/risk"
            className="px-3 py-2 rounded-[6px] text-[14px] font-medium text-navy-900 hover:bg-paper transition-colors"
          >
            Risk
          </Link>
          {/* Compliance — visible to all roles except dept-head (D-32, D-37) */}
          {activeRole !== 'dept-head' && (
            <Link
              href="/compliance"
              className="px-3 py-2 rounded-[6px] text-[14px] font-medium text-navy-900 hover:bg-paper transition-colors"
            >
              <ClipboardList className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Compliance
            </Link>
          )}
          {/* Audit — visible to all roles except board member-only navigation remains policy-enforced in routes */}
          {activeRole !== 'board-member' && (
            <Link
              href="/audit"
              className="px-3 py-2 rounded-[6px] text-[14px] font-medium text-navy-900 hover:bg-paper transition-colors"
            >
              <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Audit
            </Link>
          )}
          {/* Admin — role-gated to admin only */}
          {activeRole === 'admin' && (
            <Link
              href="/admin/users"
              className="px-3 py-2 rounded-[6px] text-[14px] font-medium text-navy-900 hover:bg-paper transition-colors"
            >
              Admin
            </Link>
          )}
        </div>
      </nav>
      {/* Main content — offset by sidebar width */}
      <main className="ml-[220px] max-w-[1200px] px-8 pt-8">
        {children}
      </main>
    </div>
  )
}
