// app/(protected)/qms/nc/page.tsx
// Phase 13 — Non-Conformance log.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, Plus, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listNonConformances } from '@/lib/qms/queries'
import { NC_SEVERITY_LABELS, NC_STATUS_LABELS } from '@/types/qms'
import type { NcSeverity, NcStatus } from '@/types/qms'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = ['admin', 'ceo', 'compliance-officer', 'risk-officer', 'audit-officer', 'board-member']
const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer', 'audit-officer']

const SEVERITY_CLASSES: Record<NcSeverity, string> = {
  minor:    'bg-yellow-50 text-yellow-700 border border-yellow-200',
  major:    'bg-orange-50 text-orange-700 border border-orange-200',
  critical: 'bg-red-50 text-red-700 border border-red-200',
}

const STATUS_CLASSES: Record<NcStatus, string> = {
  open:                'bg-red-50 text-red-700',
  root_cause_analysis: 'bg-orange-50 text-orange-700',
  corrective_action:   'bg-amber-50 text-amber-700',
  verification:        'bg-blue-50 text-blue-700',
  closed:              'bg-green-50 text-green-700',
}

export default async function NcLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const canWrite = WRITE_ROLES.includes(activeRole)
  const ncs      = await listNonConformances(supabase)
  const open     = ncs.filter(n => n.status !== 'closed')
  const closed   = ncs.filter(n => n.status === 'closed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/qms" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> QMS
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            Non-Conformances
          </h1>
        </div>
        {canWrite && (
          <Link
            href="/qms/nc/new"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Log NC
          </Link>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['minor', 'major', 'critical'].map(sev => {
          const count = open.filter(n => n.severity === sev).length
          return (
            <div key={sev} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Open {NC_SEVERITY_LABELS[sev as NcSeverity]}</p>
              <p className={cn('mt-1 text-2xl font-bold', count > 0 ? (sev === 'critical' ? 'text-red-600' : 'text-orange-500') : 'text-gray-400')}>
                {count}
              </p>
            </div>
          )
        })}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Closed</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{closed.length}</p>
        </div>
      </div>

      {/* Table */}
      {ncs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">No non-conformances logged.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Title', 'Severity', 'Status', 'Due', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ncs.map(nc => (
                <tr key={nc.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{nc.nc_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{nc.title}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-[6px] px-2 py-0.5 text-xs font-medium', SEVERITY_CLASSES[nc.severity as NcSeverity])}>
                      {NC_SEVERITY_LABELS[nc.severity as NcSeverity]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-[6px] px-2 py-0.5 text-xs font-medium', STATUS_CLASSES[nc.status as NcStatus])}>
                      {NC_STATUS_LABELS[nc.status as NcStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{nc.due_date ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/qms/nc/${nc.id}`} className="text-indigo-600 hover:underline text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
