// app/(protected)/audit/plans/[id]/engagements/[eid]/workpapers/new/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { WorkpaperForm } from './WorkpaperForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New Workpaper — GRC-Nexus' }

const CREATE_ROLES: AppRole[] = ['admin', 'audit-officer']

interface PageProps {
  params: { id: string; eid: string }
}

export default async function NewWorkpaperPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !CREATE_ROLES.includes(activeRole)) {
    redirect(`/audit/plans/${params.id}/engagements/${params.eid}`)
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-[14px] text-navy-mid">
        <Link href="/audit/plans" className="hover:underline">Plans</Link>
        {' / '}
        <Link href={`/audit/plans/${params.id}`} className="hover:underline">Plan</Link>
        {' / '}
        <Link href={`/audit/plans/${params.id}/engagements/${params.eid}`} className="hover:underline">Engagement</Link>
        {' / '}
        <span className="text-navy-900">New Workpaper</span>
      </p>
      <h1 className="mb-6 text-[20px] font-semibold text-navy-900">New Workpaper</h1>
      <WorkpaperForm engagementId={params.eid} planId={params.id} />
    </div>
  )
}
