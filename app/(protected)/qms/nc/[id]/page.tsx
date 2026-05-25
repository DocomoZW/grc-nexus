// app/(protected)/qms/nc/[id]/page.tsx
// Phase 13 — Non-conformance detail + status update.

import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getNonConformanceById } from '@/lib/qms/queries'
import { NC_SEVERITY_LABELS, NC_STATUS_LABELS, NC_SOURCE_LABELS } from '@/types/qms'
import type { NcSeverity, NcStatus, NcSource } from '@/types/qms'
import { NcStatusForm } from '@/components/qms/NcStatusForm'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[]  = ['admin', 'ceo', 'compliance-officer', 'risk-officer', 'audit-officer', 'board-member']
const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer', 'audit-officer']

const SEVERITY_CLASSES: Record<NcSeverity, string> = {
  minor:    'bg-yellow-50 text-yellow-700 border border-yellow-200',
  major:    'bg-orange-50 text-orange-700 border border-orange-200',
  critical: 'bg-red-50 text-red-700 border border-red-200',
}

export default async function NcDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const nc = await getNonConformanceById(supabase, params.id)
  if (!nc) notFound()

  const canWrite = WRITE_ROLES.includes(activeRole)
  const isClosed = nc.status === 'closed'

  return (
    <div className="space-y-6">
      <Link href="/qms/nc" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to Non-Conformances
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-xs text-gray-500">{nc.nc_number}</span>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{nc.title}</h1>
          </div>
          <span className={cn('rounded-[6px] px-2 py-0.5 text-xs font-medium', SEVERITY_CLASSES[nc.severity as NcSeverity])}>
            {NC_SEVERITY_LABELS[nc.severity as NcSeverity]}
          </span>
        </div>

        <p className="mt-4 text-sm text-gray-700">{nc.description}</p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Status</p>
            <p className={cn('mt-1 inline-flex rounded-[6px] px-2 py-0.5 text-xs font-medium', {
              'bg-red-50 text-red-700':    nc.status === 'open',
              'bg-orange-50 text-orange-700': nc.status === 'root_cause_analysis',
              'bg-amber-50 text-amber-700':   nc.status === 'corrective_action',
              'bg-blue-50 text-blue-700':  nc.status === 'verification',
              'bg-green-50 text-green-700':   nc.status === 'closed',
            })}>
              {NC_STATUS_LABELS[nc.status as NcStatus]}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Source</p>
            <p className="mt-1 text-gray-800 font-medium">{NC_SOURCE_LABELS[nc.source as NcSource]}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Due Date</p>
            <p className="mt-1 text-gray-800 font-medium">{nc.due_date ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Logged</p>
            <p className="mt-1 text-gray-800 font-medium">{new Date(nc.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {(nc.root_cause || nc.corrective_action) && (
          <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
            {nc.root_cause && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Root Cause</p>
                <p className="mt-1 text-sm text-gray-700">{nc.root_cause}</p>
              </div>
            )}
            {nc.corrective_action && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Corrective Action</p>
                <p className="mt-1 text-sm text-gray-700">{nc.corrective_action}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status update form */}
      {canWrite && !isClosed && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Update Status</h2>
          <NcStatusForm ncId={nc.id} currentStatus={nc.status as NcStatus} />
        </div>
      )}
    </div>
  )
}
