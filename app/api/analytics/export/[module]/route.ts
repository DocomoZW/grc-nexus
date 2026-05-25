// app/api/analytics/export/[module]/route.ts
// Per-module CSV export for Analytics Export admin page.
// SECURITY: admin-only; user client RLS enforces institution_id scoping.
// SECURITY: params.module validated against 9-slug allowlist (path traversal prevention).
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_MODULES = ['risks', 'kpis', 'kris', 'kcis', 'obligations', 'findings', 'incidents', 'board-actions', 'esg'] as const
type AllowedModule = typeof ALLOWED_MODULES[number]

function escapeCSV(value: unknown): string {
  const str = value == null ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { module: string } }
) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const appMeta = user.app_metadata as Record<string, string>
  if (appMeta?.active_role !== 'admin') return new Response('Forbidden', { status: 403 })

  // 2. Allowlist validation (path traversal prevention)
  if (!ALLOWED_MODULES.includes(params.module as AllowedModule)) {
    return new Response('Not Found', { status: 404 })
  }

  const mod = params.module as AllowedModule
  let csv = ''
  const filename = `grc-nexus-${mod}-${Date.now()}.csv`

  try {
    switch (mod) {
      case 'risks': {
        const { data } = await supabase.from('risks').select('id, title, description, category, owner_id, likelihood, impact, risk_score, severity, status, created_at')
        csv = 'ID,Title,Description,Category,Owner ID,Likelihood,Impact,Risk Score,Severity,Status,Created At\n'
        csv += (data ?? []).map(r => [r.id, r.title, r.description, r.category, r.owner_id, r.likelihood, r.impact, r.risk_score, r.severity, r.status, r.created_at].map(escapeCSV).join(',')).join('\n')
        break
      }
      case 'kpis': {
        const { data } = await supabase.from('kpis').select('id, title, unit_of_measure, target_value, baseline_value, reporting_frequency, status, kpi_readings(id, reporting_period, actual_value, recorded_at)')
        csv = 'KPI ID,KPI Title,Unit,Target,Baseline,Frequency,KPI Status,Reading ID,Period,Actual Value,Recorded At\n'
        const rows: string[] = []
        for (const kpi of data ?? []) {
          const readings = (kpi as any).kpi_readings ?? []
          if (readings.length === 0) {
            rows.push([kpi.id, kpi.title, kpi.unit_of_measure, kpi.target_value, kpi.baseline_value, kpi.reporting_frequency, kpi.status, '', '', '', ''].map(escapeCSV).join(','))
          } else {
            for (const r of readings) {
              rows.push([kpi.id, kpi.title, kpi.unit_of_measure, kpi.target_value, kpi.baseline_value, kpi.reporting_frequency, kpi.status, r.id, r.reporting_period, r.actual_value, r.recorded_at].map(escapeCSV).join(','))
            }
          }
        }
        csv += rows.join('\n')
        break
      }
      case 'kris': {
        const { data } = await supabase.from('kri_definitions').select('id, title, unit, target_value, alert_threshold, direction, kri_readings(id, period_start, period_end, actual_value, status, recorded_at)')
        csv = 'KRI ID,KRI Title,Unit,Target,Alert Threshold,Direction,Reading ID,Period Start,Period End,Actual Value,Reading Status,Recorded At\n'
        const rows: string[] = []
        for (const kri of data ?? []) {
          const readings = (kri as any).kri_readings ?? []
          if (readings.length === 0) {
            rows.push([kri.id, kri.title, kri.unit, kri.target_value, kri.alert_threshold, kri.direction, '', '', '', '', '', ''].map(escapeCSV).join(','))
          } else {
            for (const r of readings) {
              rows.push([kri.id, kri.title, kri.unit, kri.target_value, kri.alert_threshold, kri.direction, r.id, r.period_start, r.period_end, r.actual_value, r.status, r.recorded_at].map(escapeCSV).join(','))
            }
          }
        }
        csv += rows.join('\n')
        break
      }
      case 'kcis': {
        const { data } = await supabase.from('kci_definitions').select('id, title, unit, target_value, alert_threshold, test_cadence, kci_readings(id, period_start, period_end, actual_value, status, recorded_at)')
        csv = 'KCI ID,KCI Title,Unit,Target,Alert Threshold,Test Cadence,Reading ID,Period Start,Period End,Actual Value,Reading Status,Recorded At\n'
        const rows: string[] = []
        for (const kci of data ?? []) {
          const readings = (kci as any).kci_readings ?? []
          if (readings.length === 0) {
            rows.push([kci.id, kci.title, kci.unit, kci.target_value, kci.alert_threshold, kci.test_cadence, '', '', '', '', '', ''].map(escapeCSV).join(','))
          } else {
            for (const r of readings) {
              rows.push([kci.id, kci.title, kci.unit, kci.target_value, kci.alert_threshold, kci.test_cadence, r.id, r.period_start, r.period_end, r.actual_value, r.status, r.recorded_at].map(escapeCSV).join(','))
            }
          }
        }
        csv += rows.join('\n')
        break
      }
      case 'obligations': {
        const { data } = await supabase.from('compliance_obligations').select('id, title, framework, owner_id, due_date, status, created_at')
        csv = 'ID,Title,Framework,Owner ID,Due Date,Status,Created At\n'
        csv += (data ?? []).map(r => [r.id, r.title, r.framework, r.owner_id, r.due_date, r.status, r.created_at].map(escapeCSV).join(',')).join('\n')
        break
      }
      case 'findings': {
        const { data } = await supabase.from('audit_findings').select('id, title, severity, status, owner_id, root_cause, created_at, closed_at')
        csv = 'ID,Title,Severity,Status,Owner ID,Root Cause,Created At,Closed At\n'
        csv += (data ?? []).map(r => [r.id, r.title, r.severity, r.status, r.owner_id, r.root_cause, r.created_at, r.closed_at].map(escapeCSV).join(',')).join('\n')
        break
      }
      case 'incidents': {
        // SECURITY: Do NOT include submitter_id — anonymity per INCD-02
        const { data } = await supabase.from('incident_cases').select('id, category, status, assigned_to, created_at, closed_at')
        csv = 'ID,Category,Status,Assigned To,Created At,Closed At\n'
        csv += (data ?? []).map(r => [r.id, r.category, r.status, r.assigned_to, r.created_at, r.closed_at].map(escapeCSV).join(',')).join('\n')
        break
      }
      case 'board-actions': {
        const { data } = await supabase.from('board_action_items').select('id, title, owner_id, due_date, status, resolution_id, created_at')
        csv = 'ID,Title,Owner ID,Due Date,Status,Resolution ID,Created At\n'
        csv += (data ?? []).map(r => [r.id, r.title, r.owner_id, r.due_date, r.status, r.resolution_id, r.created_at].map(escapeCSV).join(',')).join('\n')
        break
      }
      case 'esg': {
        const { data } = await supabase.from('esg_metrics').select('id, name, category, code, unit, target_value, esg_readings(id, period_label, actual_value, notes, created_at)')
        csv = 'Metric ID,Metric Name,Category,Code,Unit,Target,Reading ID,Period,Actual Value,Notes,Recorded At\n'
        const rows: string[] = []
        for (const m of data ?? []) {
          const readings = (m as any).esg_readings ?? []
          if (readings.length === 0) {
            rows.push([m.id, m.name, m.category, m.code, m.unit, m.target_value, '', '', '', '', ''].map(escapeCSV).join(','))
          } else {
            for (const r of readings) {
              rows.push([m.id, m.name, m.category, m.code, m.unit, m.target_value, r.id, r.period_label, r.actual_value, r.notes, r.created_at].map(escapeCSV).join(','))
            }
          }
        }
        csv += rows.join('\n')
        break
      }
    }
  } catch (err) {
    console.error('[analytics/export] Query error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
