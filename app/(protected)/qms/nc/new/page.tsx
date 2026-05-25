// app/(protected)/qms/nc/new/page.tsx
// Phase 13 — Log a new non-conformance.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { NcForm } from '@/components/qms/NcForm'

export const dynamic = 'force-dynamic'

const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer', 'audit-officer']

export default async function NewNcPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !WRITE_ROLES.includes(activeRole)) redirect('/qms/nc')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log Non-Conformance</h1>
        <p className="text-sm text-gray-500 mt-1">Record a new non-conformance for root cause analysis and corrective action.</p>
      </div>
      <NcForm />
    </div>
  )
}
