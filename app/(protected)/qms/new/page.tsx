// app/(protected)/qms/new/page.tsx
// Phase 13 — Create QMS document.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { QmsDocumentForm } from '@/components/qms/QmsDocumentForm'

export const dynamic = 'force-dynamic'

const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer', 'audit-officer']

export default async function NewQmsDocPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !WRITE_ROLES.includes(activeRole)) redirect('/qms')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Register Document</h1>
        <p className="text-sm text-gray-500 mt-1">Add a new controlled document to the QMS register.</p>
      </div>
      <QmsDocumentForm />
    </div>
  )
}
