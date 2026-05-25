// app/(protected)/esg/page.tsx
// Phase 12 — ESG metrics list page.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart3, Plus, Target, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listEsgMetrics } from '@/lib/esg/queries'
import { ESG_CATEGORY_COLORS, type EsgCategory } from '@/types/esg'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = [
  'admin', 'ceo', 'compliance-officer', 'risk-officer', 'audit-officer', 'board-member',
]
const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer', 'audit-officer']

function CategoryBadge({ category }: { category: EsgCategory }) {
  const classes: Record<EsgCategory, string> = {
    Environmental: 'bg-green-50 text-green-700 border border-green-200',
    Social:        'bg-blue-50 text-blue-700 border border-blue-200',
    Governance:    'bg-purple-50 text-purple-700 border border-purple-200',
  }
  return (
    <span className={cn('inline-flex rounded-[6px] px-[8px] py-[4px] text-[13px] font-medium', classes[category])}>
      {category}
    </span>
  )
}

export default async function EsgPage() {
  const supabase   = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const canWrite = WRITE_ROLES.includes(activeRole)
  const metrics  = await listEsgMetrics(supabase)

  const byCategory = metrics.reduce<Record<string, number>>(
    (acc, m) => { acc[m.category] = (acc[m.category] ?? 0) + 1; return acc },
    {},
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-green-600" />
            ESG Metrics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Environmental, Social &amp; Governance performance tracking
          </p>
        </div>
        {canWrite && (
          <Link
            href="/esg/new"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Metric
          </Link>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['Environmental', 'Social', 'Governance'] as EsgCategory[]).map(cat => (
          <div key={cat} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{cat}</span>
              <Target
                className="h-5 w-5"
                style={{ color: ESG_CATEGORY_COLORS[cat] }}
              />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{byCategory[cat] ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">metrics tracked</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {metrics.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">No ESG metrics defined yet.</p>
          {canWrite && (
            <Link href="/esg/new" className="mt-4 inline-flex items-center gap-1 text-sm text-green-600 hover:underline">
              <Plus className="h-4 w-4" />
              Add your first metric
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Code', 'Name', 'Category', 'Framework', 'Unit', 'Target', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.metric_code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={m.category} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.esg_framework ? (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
                        {m.esg_framework.code}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.target_value != null ? (
                      <span className="font-medium">{m.target_value}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/esg/${m.id}`} className="text-green-600 hover:underline text-xs font-medium">
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
