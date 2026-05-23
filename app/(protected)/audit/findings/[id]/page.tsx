import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getAuditFindingById, listAuditFindingEvidence } from '@/lib/audit/queries'
import { AuditFindingDetail } from './AuditFindingDetail'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin',
  'ceo',
  'audit-officer',
  'risk-officer',
  'compliance-officer',
  'board-member',
  'dept-head',
]

interface PageProps {
  params: { id: string }
}

export default async function AuditFindingDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const [findingResult, evidenceResult] = await Promise.all([
    getAuditFindingById(supabase, params.id),
    listAuditFindingEvidence(supabase, params.id),
  ])

  if (findingResult.error || !findingResult.data) {
    notFound()
  }

  const finding = findingResult.data as unknown as {
    id: string
    finding_reference: string
    title: string
    description: string | null
    severity: 'low' | 'medium' | 'high' | 'critical'
    status: 'open' | 'in_progress' | 'closed'
    root_cause: string
    linked_entity_type: 'risk' | 'control' | 'compliance_obligation'
    linked_entity_id: string
    remediation_owner_id: string | null
    review_date: string
    due_date: string
    closed_at: string | null
    created_at: string
    updated_at: string | null
    user_profiles: { first_name: string | null; last_name: string | null } | null
  }

  const evidence = (evidenceResult.data ?? []) as unknown as Array<{
    id: string
    original_filename: string
    file_size_bytes: number
    mime_type: string
    sha256_hash: string
    uploaded_at: string
    user_profiles: { first_name: string | null; last_name: string | null } | null
  }>

  return <AuditFindingDetail finding={finding} evidence={evidence} activeRole={activeRole} />
}
