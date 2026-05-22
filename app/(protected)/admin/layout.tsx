// app/(protected)/admin/layout.tsx
// Admin section layout — verifies active_role === 'admin'.
// Non-admins redirected to /dashboard.
// SECURITY: force-dynamic prevents ISR from caching admin responses.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const appMeta = user.app_metadata as Record<string, string>
  if (appMeta?.active_role !== 'admin') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
