import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getAuditFindingById } from '@/lib/audit/queries'
import { AuditEvidenceUploadForm } from './AuditEvidenceUploadForm'

export const dynamic = 'force-dynamic'

const WRITE_ROLES: AppRole[] = ['admin', 'audit-officer', 'dept-head', 'ceo', 'risk-officer', 'compliance-officer']

interface PageProps {
  params: { id: string }
}

export default async function AuditEvidenceUploadPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !WRITE_ROLES.includes(activeRole)) {
    redirect(`/audit/findings/${params.id}`)
  }

  const { data, error } = await getAuditFindingById(supabase, params.id)
  if (error || !data) notFound()

  const finding = data as {
    id: string
    title: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900">Upload Closure Evidence</h1>
        <p className="mt-1 text-[14px] text-navy-mid">Attach immutable evidence for finding remediation closure.</p>
      </div>
      <AuditEvidenceUploadForm findingId={finding.id} findingTitle={finding.title} findingSeverity={finding.severity} />
    </div>
  )
}
