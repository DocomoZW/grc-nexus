// app/(protected)/qms/page.tsx
// Phase 13 — QMS main page: document register.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listQmsDocuments, getQmsDashboardStats } from '@/lib/qms/queries'
import { QMS_DOC_TYPE_LABELS, QMS_DOC_STATUS_LABELS } from '@/types/qms'
import type { QmsDocStatus, QmsDocType } from '@/types/qms'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = ['admin', 'ceo', 'compliance-officer', 'risk-officer', 'audit-officer', 'board-member']
const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer', 'audit-officer']

const STATUS_CLASSES: Record<QmsDocStatus, string> = {
  draft:        'bg-gray-100 text-gray-600',
  under_review: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved:     'bg-green-50 text-green-700 border border-green-200',
  obsolete:     'bg-red-50 text-red-700 border border-red-200',
}

export default async function QmsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const canWrite = WRITE_ROLES.includes(activeRole)
  const [docs, stats] = await Promise.all([
    listQmsDocuments(supabase),
    getQmsDashboardStats(supabase),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            Quality Management System
          </h1>
          <p className="text-sm text-gray-500 mt-1">ISO 9001 controlled documents &amp; non-conformance log</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/qms/nc"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Non-Conformances
          </Link>
          {canWrite && (
            <Link
              href="/qms/new"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Document
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Approved Docs</p>
          <p className="mt-1 text-3xl font-bold text-green-700">{stats.approvedDocs}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overdue Reviews</p>
          <p className={cn('mt-1 text-3xl font-bold', stats.overdueReviews > 0 ? 'text-red-600' : 'text-gray-900')}>
            {stats.overdueReviews}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Open NCs</p>
          <p className={cn('mt-1 text-3xl font-bold', stats.openNcs > 0 ? 'text-amber-600' : 'text-gray-900')}>
            {stats.openNcs}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Critical NCs</p>
          <p className={cn('mt-1 text-3xl font-bold', stats.criticalNcs > 0 ? 'text-red-600' : 'text-gray-900')}>
            {stats.criticalNcs}
          </p>
        </div>
      </div>

      {/* Document table */}
      {docs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">No documents registered yet.</p>
          {canWrite && (
            <Link href="/qms/new" className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
              <Plus className="h-4 w-4" />
              Add first document
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Code', 'Title', 'Type', 'Version', 'Status', 'Review Due', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(d => {
                const overdue = d.review_due_at && d.review_due_at < new Date().toISOString().split('T')[0]
                return (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.doc_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.title}</td>
                    <td className="px-4 py-3 text-gray-600">{QMS_DOC_TYPE_LABELS[d.doc_type as QmsDocType]}</td>
                    <td className="px-4 py-3 text-gray-600">v{d.version}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-[6px] px-2 py-0.5 text-xs font-medium', STATUS_CLASSES[d.status])}>
                        {QMS_DOC_STATUS_LABELS[d.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.review_due_at ? (
                        <span className={cn('text-sm', overdue ? 'text-red-600 font-medium' : 'text-gray-500')}>
                          {overdue && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                          {d.review_due_at}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.file_url && (
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                           className="text-indigo-600 hover:underline text-xs font-medium mr-3">
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
