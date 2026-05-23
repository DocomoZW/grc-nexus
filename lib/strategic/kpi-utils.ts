// lib/strategic/kpi-utils.ts
// Pure business-logic functions for KPI performance status calculation.
// NO imports from Supabase, Next.js, or React — pure functions only.

export const KPI_ON_TRACK_THRESHOLD = 0.90  // actual >= 90% of target
export const KPI_AT_RISK_THRESHOLD  = 0.70  // actual >= 70% and < 90% of target

export type KpiStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data'

/**
 * Calculate KPI performance status.
 *
 * Edge cases:
 *  - actual null/undefined → 'no_data' (D-15: no readings yet)
 *  - target_value = 0 → guard: return 'no_data' (avoid division by zero;
 *    a zero-target KPI has no meaningful % calculation — D-16)
 *  - actual > target (overperformed) → ratio > 1.0 → falls into 'on_track'
 *    (≥0.90 threshold; no special "overperformed" status in Phase 2 per D-14)
 */
export function calculateKpiStatus(
  actualValue: number | null | undefined,
  targetValue: number,
): KpiStatus {
  // No data: no readings yet (D-15)
  if (actualValue === null || actualValue === undefined) return 'no_data'

  // Guard: target of zero has no meaningful ratio (prevents division by zero — D-16)
  if (targetValue === 0) return 'no_data'

  const ratio = actualValue / targetValue

  if (ratio >= KPI_ON_TRACK_THRESHOLD) return 'on_track'   // ≥90% (includes overperformed)
  if (ratio >= KPI_AT_RISK_THRESHOLD)  return 'at_risk'    // 70–89%
  return 'off_track'                                         // <70%
}

/**
 * Badge display configuration for each KPI status.
 * Uses Tailwind color tokens from tailwind.config.ts:
 *   ok: #27AE60, warn: #E67E22, err: #E74C3C, paper-border: #D7E2EF
 */
export const KPI_STATUS_BADGE: Record<KpiStatus, { label: string; className: string }> = {
  on_track:  { label: 'On Track',  className: 'bg-ok/10 text-ok border-ok/30' },
  at_risk:   { label: 'At Risk',   className: 'bg-warn/10 text-warn border-warn/30' },
  off_track: { label: 'Off Track', className: 'bg-err/10 text-err border-err/30' },
  no_data:   { label: 'No Data',   className: 'bg-paper text-navy-mid border-paper-border' },
}
