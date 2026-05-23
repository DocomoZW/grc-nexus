// app/(protected)/strategic/objectives/[id]/page.tsx
// Server Component — objective detail page with linked KPIs list.
// SECURITY: force-dynamic prevents ISR caching; RLS enforces institution_id isolation (T-02-P04-02).
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { AppRole } from '@/types/auth'
import type { ObjectiveStatus, Nds2Pillar } from '@/types/strategic'
import { NDS2_PILLAR_LABELS, OBJECTIVE_STATUS_LABELS, KPI_FREQUENCY_LABELS } from '@/types/strategic'

export const dynamic = 'force-dynamic'

const OBJECTIVE_STATUS_BADGE: Record<ObjectiveStatus, string> = {
  draft:     'bg-paper text-navy-mid border-paper-border',
  active:    'bg-ok/10 text-ok border-ok/30',
  at_risk:   'bg-warn/10 text-warn border-warn/30',
  completed: 'bg-ok/10 text-ok border-ok/30',
  cancelled: 'bg-paper text-navy-mid border-paper-border',
}

const EDIT_ROLES: AppRole[] = ['admin', 'ceo']
const KPI_CREATE_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer']

interface PageProps {
  params: { id: string }
}

export default async function ObjectiveDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  // Fetch objective with owner profile — RLS enforces institution_id scoping (T-02-P04-02)
  const { data: objective } = await supabase
    .from('strategic_objectives')
    .select('*, user_profiles!owner_id(full_name)')
    .eq('id', params.id)
    .single()

  // If objective not found (or belongs to another institution, RLS returns null) → redirect
  if (!objective) {
    redirect('/strategic/objectives')
  }

  // Fetch linked KPIs
  const { data: kpis } = await supabase
    .from('kpis')
    .select('id, title, unit_of_measure, target_value, reporting_frequency, owner_id, user_profiles!owner_id(full_name)')
    .eq('objective_id', params.id)
    .order('created_at', { ascending: false })

  const canEdit = activeRole ? EDIT_ROLES.includes(activeRole) : false
  const canAddKpi = activeRole ? KPI_CREATE_ROLES.includes(activeRole) : false

  const ownerName = (objective.user_profiles as { full_name: string } | null)?.full_name ?? '—'
  const pillarDisplay = objective.nds2_pillar
    ? NDS2_PILLAR_LABELS[objective.nds2_pillar as Nds2Pillar]
    : objective.institutional_goal ?? '—'

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[20px] font-semibold text-navy-900 font-body">{objective.title}</h1>
            <Badge
              className={`text-[12px] font-medium border ${OBJECTIVE_STATUS_BADGE[objective.status as ObjectiveStatus]}`}
            >
              {OBJECTIVE_STATUS_LABELS[objective.status as ObjectiveStatus]}
            </Badge>
          </div>
          <Link
            href="/strategic/objectives"
            className="text-[13px] text-navy-mid hover:text-navy-900 transition-colors mt-1 inline-block"
          >
            &larr; Back to Objectives
          </Link>
        </div>
        {canEdit && (
          <Link
            href={`/strategic/objectives/${params.id}/edit`}
            className="inline-flex items-center px-4 py-2 rounded-[8px] bg-gold text-navy-950 hover:bg-gold-hi text-[13px] font-medium shadow-card transition-colors"
          >
            Edit Objective
          </Link>
        )}
      </div>

      {/* Detail card */}
      <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {objective.description && (
            <div className="md:col-span-2">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid mb-1">Description</p>
              <p className="text-[14px] text-navy-900">{objective.description}</p>
            </div>
          )}
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid mb-1">NDS2 Pillar / Goal</p>
            <p className="text-[14px] text-navy-900">{pillarDisplay}</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid mb-1">Owner</p>
            <p className="text-[14px] text-navy-900">{ownerName}</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid mb-1">Start Date</p>
            <p className="text-[14px] text-navy-900 font-mono">
              {objective.start_date ? format(new Date(objective.start_date), 'yyyy-MM-dd') : '—'}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid mb-1">Target Date</p>
            <p className="text-[14px] text-navy-900 font-mono">
              {objective.target_date ? format(new Date(objective.target_date), 'yyyy-MM-dd') : '—'}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid mb-1">Created</p>
            <p className="text-[14px] text-navy-900 font-mono">
              {format(new Date(objective.created_at), 'yyyy-MM-dd')}
            </p>
          </div>
        </div>
      </div>

      {/* Linked KPIs section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-navy-900">Linked KPIs</h2>
          {canAddKpi && (
            <Link
              href={`/strategic/kpis/new?objective_id=${params.id}`}
              className="inline-flex items-center px-3 py-1.5 rounded-[6px] bg-gold text-navy-950 hover:bg-gold-hi text-[13px] font-medium shadow-card transition-colors"
            >
              Add KPI
            </Link>
          )}
        </div>

        {(!kpis || kpis.length === 0) ? (
          <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-8 text-center">
            <p className="text-[14px] text-navy-mid">No KPIs linked to this objective yet.</p>
            {canAddKpi && (
              <Link
                href={`/strategic/kpis/new?objective_id=${params.id}`}
                className="text-[14px] text-navy-900 hover:underline font-medium mt-2 inline-block"
              >
                Add the first KPI
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[10px] border border-paper-border shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-paper border-b border-paper-border">
                  <th className="text-left text-[13px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">Title</th>
                  <th className="text-left text-[13px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">Target</th>
                  <th className="text-left text-[13px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">Frequency</th>
                  <th className="text-left text-[13px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi) => {
                  const kpiOwner = (kpi.user_profiles as { full_name: string } | null)?.full_name ?? '—'
                  return (
                    <tr key={kpi.id} className="border-b border-paper-border last:border-0 hover:bg-gray-50">
                      <td className="text-[13px] text-navy-900 px-4 py-3">
                        <Link
                          href={`/strategic/kpis/${kpi.id}`}
                          className="font-medium hover:underline"
                        >
                          {kpi.title}
                        </Link>
                      </td>
                      <td className="text-[13px] text-navy-900 px-4 py-3 font-mono">
                        {kpi.target_value} {kpi.unit_of_measure}
                      </td>
                      <td className="text-[13px] text-navy-900 px-4 py-3">
                        {KPI_FREQUENCY_LABELS[kpi.reporting_frequency as keyof typeof KPI_FREQUENCY_LABELS]}
                      </td>
                      <td className="text-[13px] text-navy-900 px-4 py-3">{kpiOwner}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
