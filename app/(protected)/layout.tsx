// app/(protected)/layout.tsx
// Auth-gated layout — defense-in-depth auth check (middleware also checks, this is second layer).
// SECURITY: Uses getUser() — NOT getSession() (getSession() does not validate JWT).
// SECURITY: force-dynamic prevents ISR caching of authenticated responses.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarLayout } from '@/components/layout/SidebarLayout'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { Notification } from '@/types/notifications'

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

  // If institution_id is missing from app_metadata the JWT is stale (issued before
  // raw_app_meta_data was seeded). Redirect to the refresh Route Handler which can
  // write new cookies, then come back to dashboard with a valid token.
  // Server Components cannot write cookies directly — the Route Handler can.
  if (!appMeta?.institution_id) {
    redirect('/api/auth/refresh?next=/dashboard')
  }

  const activeRole = appMeta?.active_role ?? ''

  // Fetch 10 most recent notifications for the bell (graceful — empty on error)
  const { data: notifData } = await supabase
    .from('notifications')
    .select('id, institution_id, user_id, title, body, link, source_module, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const notifications = (notifData ?? []) as unknown as Notification[]

  return (
    <SidebarLayout
      activeRole={activeRole}
      notificationBell={
        <NotificationBell initialNotifications={notifications} userId={user.id} />
      }
    >
      {children}
    </SidebarLayout>
  )
}
