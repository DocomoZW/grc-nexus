// app/(protected)/audit/plans/new/page.tsx
// Server Component shell for creating an audit plan.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { PlanForm } from './PlanForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New Audit Plan — GRC-Nexus' }

const CREATE_ROLES: AppRole[] = ['admin', 'audit-officer']

export default async function NewAuditPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !CREATE_ROLES.includes(activeRole)) redirect('/audit/plans')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900">New Audit Plan</h1>
        <p className="text-[14px] text-navy-mid mt-1">Create an annual or periodic audit plan.</p>
      </div>
      <PlanForm />
    </div>
  )
}
