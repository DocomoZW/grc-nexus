// app/(protected)/esg/new/page.tsx
// Phase 12 — Create new ESG metric.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listEsgFrameworks } from '@/lib/esg/queries'
import { EsgMetricForm } from '@/components/esg/EsgMetricForm'

export const dynamic = 'force-dynamic'

const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer', 'audit-officer']

export default async function NewEsgMetricPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !WRITE_ROLES.includes(activeRole)) redirect('/esg')

  const frameworks = await listEsgFrameworks(supabase)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New ESG Metric</h1>
        <p className="text-sm text-gray-500 mt-1">Define a new ESG performance indicator to track.</p>
      </div>
      <EsgMetricForm frameworks={frameworks} />
    </div>
  )
}
