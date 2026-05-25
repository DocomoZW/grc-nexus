// app/(protected)/esg/[id]/page.tsx
// Phase 12 — ESG metric detail + readings chart.

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getEsgMetricById, listEsgReadings } from '@/lib/esg/queries'
import { EsgReadingForm } from '@/components/esg/EsgReadingForm'
import { EsgReadingsChart } from '@/components/esg/EsgReadingsChart'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = ['admin', 'ceo', 'compliance-officer', 'risk-officer', 'audit-officer', 'board-member']
const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer', 'audit-officer']

export default async function EsgMetricDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const metric   = await getEsgMetricById(supabase, params.id)
  if (!metric) notFound()

  const readings = await listEsgReadings(supabase, params.id)
  const canWrite = WRITE_ROLES.includes(activeRole)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/esg" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to ESG Metrics
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-xs text-gray-500">{metric.metric_code}</span>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{metric.name}</h1>
            {metric.description && <p className="text-sm text-gray-600 mt-2">{metric.description}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`rounded-[6px] px-2 py-0.5 text-xs font-medium ${
              metric.category === 'Environmental' ? 'bg-green-50 text-green-700 border border-green-200' :
              metric.category === 'Social'        ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                    'bg-purple-50 text-purple-700 border border-purple-200'
            }`}>{metric.category}</span>
            {metric.esg_framework && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {metric.esg_framework.code}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Unit</span>
            <p className="font-medium text-gray-900">{metric.unit}</p>
          </div>
          <div>
            <span className="text-gray-500">Target</span>
            <p className="font-medium text-gray-900">
              {metric.target_value != null ? `${metric.target_value} ${metric.unit}` : '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Readings</span>
            <p className="font-medium text-gray-900">{readings.length}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {readings.length > 1 && (
        <EsgReadingsChart
          readings={readings}
          targetValue={metric.target_value}
          unit={metric.unit}
        />
      )}

      {/* Add reading */}
      {canWrite && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <PlusCircle className="h-4 w-4 text-green-600" />
            Record Reading
          </h2>
          <EsgReadingForm metricId={metric.id} />
        </div>
      )}

      {/* Readings log */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Reading History</h2>
        </div>
        {readings.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No readings recorded yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Period', 'Actual', 'Target', 'Notes', 'Recorded'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {readings.map(r => {
                const onTarget = metric.target_value != null && r.actual_value >= metric.target_value
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.period_label}</td>
                    <td className="px-4 py-3">
                      <span className={onTarget ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                        {r.actual_value} {metric.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {metric.target_value != null ? `${metric.target_value} ${metric.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
