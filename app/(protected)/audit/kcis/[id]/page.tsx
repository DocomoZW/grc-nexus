// app/(protected)/audit/kcis/[id]/page.tsx
// KCI detail page — Server Component.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { getKciById, getLatestKciReading } from '@/lib/audit/kci-queries'
import { INDICATOR_STATUS_BADGE, DIRECTION_LABELS } from '@/lib/risk/kri-utils'
import { IndicatorStatusBadge } from '@/components/indicators/IndicatorStatusBadge'
import { IndicatorSparkline } from '@/components/indicators/IndicatorSparkline'
import { RecordReadingForm } from './RecordReadingForm'
import { KPI_FREQUENCY_LABELS } from '@/types/strategic'
import { Badge } from '@/components/ui/badge'
import type { AppRole, AppMetadata } from '@/types/auth'
import type { IndicatorStatus, IndicatorDirection, KpiFrequency } from '@/types/kci'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

type KciReadingRow = {
  id: string
  actual_value: number
  status: IndicatorStatus
  period_start: string
  period_end: string
  notes: string | null
  recorded_at: string
}

type KciDetailRow = {
  id: string
  title: string
  description: string | null
  owner_id: string | null
  unit_of_measure: string
  target_value: number
  alert_threshold: number
  direction: IndicatorDirection
  reporting_frequency: KpiFrequency
  risk_treatments: { id: string; title: string } | null
  user_profiles: { first_name: string | null; last_name: string | null } | null
  kci_readings: KciReadingRow[] | null
}

const VIEW_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member', 'dept-head']

export default async function KciDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta    = user.app_metadata as Partial<AppMetadata>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) redirect('/audit/kcis')

  const { data } = await getKciById(supabase, params.id)
  if (!data) redirect('/audit/kcis')

  const kci      = data as unknown as KciDetailRow
  const readings = (kci.kci_readings ?? []).sort((a, b) =>
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )
  const latest   = getLatestKciReading(readings)
  const status: IndicatorStatus = latest?.status ?? 'no_data'
  const badge    = INDICATOR_STATUS_BADGE[status]

  const ownerProfile = Array.isArray(kci.user_profiles) ? (kci.user_profiles as KciDetailRow['user_profiles'][])[0] : kci.user_profiles
  const ownerName = [ownerProfile?.first_name, ownerProfile?.last_name].filter(Boolean).join(' ') || '—'
  const treatmentTitle = (Array.isArray(kci.risk_treatments) ? (kci.risk_treatments as { title: string }[])[0]?.title : kci.risk_treatments?.title) ?? null

  const canRecord = activeRole === 'admin' || activeRole === 'audit-officer' || user.id === kci.owner_id

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[20px] font-semibold text-navy-900 font-body">{kci.title}</h1>
            <Badge className={`text-[12px] font-medium border ${badge.className}`}>{badge.label}</Badge>
          </div>
          <Link href="/audit/kcis" className="text-[13px] text-navy-mid hover:text-navy-900 transition-colors mt-1 inline-block">
            &larr; Back to KCIs
          </Link>
        </div>
        {canRecord && (
          <Link
            href="#record"
            className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[13px] font-medium text-navy-950 hover:bg-gold-hi"
          >
            Record Reading
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-[10px] border border-paper-border bg-white shadow-card p-6">
            <h2 className="text-[13px] font-semibold text-navy-900 uppercase tracking-wide mb-4">Definition</h2>
            <dl className="space-y-3 text-[13px]">
              {kci.description && (
                <div>
                  <dt className="text-navy-mid">Description</dt>
                  <dd className="text-navy-900 mt-0.5">{kci.description}</dd>
                </div>
              )}
              {treatmentTitle && (
                <div>
                  <dt className="text-navy-mid">Linked Treatment</dt>
                  <dd className="text-navy-900 mt-0.5">{treatmentTitle}</dd>
                </div>
              )}
              <div>
                <dt className="text-navy-mid">Target</dt>
                <dd className="text-navy-900 mt-0.5">{kci.target_value} {kci.unit_of_measure}</dd>
              </div>
              <div>
                <dt className="text-navy-mid">Alert Threshold</dt>
                <dd className="text-navy-900 mt-0.5">{kci.alert_threshold} {kci.unit_of_measure}</dd>
              </div>
              <div>
                <dt className="text-navy-mid">Direction</dt>
                <dd className="text-navy-900 mt-0.5">{DIRECTION_LABELS[kci.direction]}</dd>
              </div>
              <div>
                <dt className="text-navy-mid">Frequency</dt>
                <dd className="text-navy-900 mt-0.5">{KPI_FREQUENCY_LABELS[kci.reporting_frequency]}</dd>
              </div>
              <div>
                <dt className="text-navy-mid">Owner</dt>
                <dd className="text-navy-900 mt-0.5">{ownerName}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[10px] border border-paper-border bg-white shadow-card p-6">
            <h2 className="text-[13px] font-semibold text-navy-900 uppercase tracking-wide mb-4">Trend (last 6)</h2>
            <IndicatorSparkline readings={readings.map(r => ({ actual_value: r.actual_value, recorded_at: r.recorded_at }))} status={status} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[10px] border border-paper-border bg-white shadow-card">
            <div className="px-6 py-4 border-b border-paper-border">
              <h2 className="text-[13px] font-semibold text-navy-900 uppercase tracking-wide">Reading History</h2>
            </div>
            {readings.length === 0 ? (
              <p className="px-6 py-8 text-center text-[14px] text-navy-mid">No readings recorded yet.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="border-b border-paper-border bg-paper text-[12px] font-medium text-navy-mid uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-left">Actual</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3 text-left">Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border">
                  {readings.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-navy-900">{r.period_start} – {r.period_end}</td>
                      <td className="px-4 py-3 font-medium text-navy-900">{r.actual_value} {kci.unit_of_measure}</td>
                      <td className="px-4 py-3"><IndicatorStatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-navy-mid max-w-[200px] truncate">{r.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-navy-mid">{format(new Date(r.recorded_at), 'dd MMM yyyy HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {canRecord && (
            <div id="record" className="rounded-[10px] border border-paper-border bg-white shadow-card p-6">
              <h2 className="text-[14px] font-semibold text-navy-900 mb-4">Record a Reading</h2>
              <RecordReadingForm kciId={kci.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
