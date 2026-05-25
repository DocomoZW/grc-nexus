// app/(protected)/risk/kris/page.tsx
// KRI list page — Server Component.
// Shows all KRI definitions with their latest reading status and trend sparkline.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getKrisWithReadings, getLatestKriReading } from '@/lib/risk/kri-queries'
import { INDICATOR_STATUS_BADGE, DIRECTION_LABELS } from '@/lib/risk/kri-utils'
import { IndicatorStatusBadge } from '@/components/indicators/IndicatorStatusBadge'
import { IndicatorSparkline } from '@/components/indicators/IndicatorSparkline'
import { Badge } from '@/components/ui/badge'
import type { IndicatorStatus, IndicatorDirection } from '@/types/kri'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Key Risk Indicators — GRC-Nexus' }

const VIEW_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member', 'dept-head']
const CREATE_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer']

type KriRow = {
  id: string
  title: string
  unit_of_measure: string
  target_value: number
  alert_threshold: number
  direction: IndicatorDirection
  reporting_frequency: string
  owner_id: string | null
  user_profiles: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
  kri_readings: { id: string; actual_value: number; status: IndicatorStatus; period_start: string; period_end: string; recorded_at: string }[] | null
}

export default async function KrisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/dashboard')

  const { data } = await getKrisWithReadings(supabase)
  const rows = data as unknown as KriRow[]

  const canCreate = CREATE_ROLES.includes(activeRole)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900">Key Risk Indicators</h1>
          <p className="mt-1 text-[14px] text-navy-mid">{rows.length} indicator{rows.length !== 1 ? 's' : ''} defined</p>
        </div>
        {canCreate && (
          <Link
            href="/risk/kris/new"
            className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[13px] font-medium text-navy-950 hover:bg-gold-hi"
          >
            Add KRI
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-paper-border bg-paper p-12 text-center">
          <p className="text-[14px] text-navy-mid">No KRIs defined yet.</p>
          {canCreate && (
            <Link href="/risk/kris/new" className="mt-3 inline-block text-[13px] font-medium text-gold hover:underline">
              Add the first KRI →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-paper-border bg-white shadow-card">
          <table className="w-full text-[13px]">
            <thead className="border-b border-paper-border bg-paper text-[12px] font-medium text-navy-mid uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">KRI</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Latest Value</th>
                <th className="px-4 py-3 text-left">Target / Threshold</th>
                <th className="px-4 py-3 text-left">Trend</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {rows.map((row) => {
                const readings = row.kri_readings ?? []
                const latest   = getLatestKriReading(readings)
                const status: IndicatorStatus = latest?.status ?? 'no_data'
                const ownerProfile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles
                const ownerName = [ownerProfile?.first_name, ownerProfile?.last_name].filter(Boolean).join(' ') || '—'

                return (
                  <tr key={row.id} className="hover:bg-paper/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-navy-900 max-w-[220px] truncate">{row.title}</td>
                    <td className="px-4 py-3">
                      <IndicatorStatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-navy-900">
                      {latest ? `${latest.actual_value} ${row.unit_of_measure}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-navy-mid">
                      {row.target_value} / {row.alert_threshold} {row.unit_of_measure}
                    </td>
                    <td className="px-4 py-3">
                      <IndicatorSparkline readings={readings} status={status} />
                    </td>
                    <td className="px-4 py-3 text-navy-mid">{ownerName}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/risk/kris/${row.id}`}
                        className="text-[12px] font-medium text-gold hover:underline"
                      >
                        View →
                      </Link>
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
