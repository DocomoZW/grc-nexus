// lib/qms/queries.ts
// Phase 13 — QMS query helpers.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QmsDocument, NonConformance, ManagementReview } from '@/types/qms'

export async function listQmsDocuments(supabase: SupabaseClient): Promise<QmsDocument[]> {
  const { data } = await supabase
    .from('qms_documents')
    .select('*')
    .order('doc_type')
    .order('doc_code')
  return (data ?? []) as unknown as QmsDocument[]
}

export async function getQmsDocumentById(supabase: SupabaseClient, id: string): Promise<QmsDocument | null> {
  const { data } = await supabase.from('qms_documents').select('*').eq('id', id).single()
  return (data ?? null) as unknown as QmsDocument | null
}

export async function listNonConformances(supabase: SupabaseClient): Promise<NonConformance[]> {
  const { data } = await supabase
    .from('non_conformances')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as NonConformance[]
}

export async function getNonConformanceById(supabase: SupabaseClient, id: string): Promise<NonConformance | null> {
  const { data } = await supabase.from('non_conformances').select('*').eq('id', id).single()
  return (data ?? null) as unknown as NonConformance | null
}

export async function listManagementReviews(supabase: SupabaseClient): Promise<ManagementReview[]> {
  const { data } = await supabase
    .from('management_reviews')
    .select('*')
    .order('review_date', { ascending: false })
  return (data ?? []) as unknown as ManagementReview[]
}

export async function getQmsDashboardStats(supabase: SupabaseClient) {
  const [{ data: docs }, { data: ncs }, { data: reviews }] = await Promise.all([
    supabase.from('qms_documents').select('id, status, review_due_at'),
    supabase.from('non_conformances').select('id, status, severity'),
    supabase.from('management_reviews').select('id, status, review_date'),
  ])

  const today = new Date().toISOString().split('T')[0]

  const approvedDocs = (docs ?? []).filter((d: { status: string }) => d.status === 'approved').length
  const overdueReviews = (docs ?? []).filter(
    (d: { review_due_at: string | null }) => d.review_due_at && d.review_due_at < today
  ).length
  const openNcs   = (ncs ?? []).filter((n: { status: string }) => n.status !== 'closed').length
  const criticalNcs = (ncs ?? []).filter((n: { severity: string; status: string }) => n.severity === 'critical' && n.status !== 'closed').length

  return {
    approvedDocs,
    overdueReviews,
    openNcs,
    criticalNcs,
    totalReviews: (reviews ?? []).length,
  }
}
