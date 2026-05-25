// lib/risk/kri-utils.ts
// Pure business-logic functions for KRI/KCI performance status calculation.
// NO imports from Supabase, Next.js, or React — pure functions only.

import type { IndicatorStatus, IndicatorDirection } from '@/types/kri'

/**
 * Calculate indicator status based on actual value vs alert threshold.
 * The `direction` field determines which side of the threshold triggers a breach.
 *
 * lower_is_worse: a low actual value is bad (e.g. control pass rate %)
 *   - actual >= target          → on_track
 *   - actual < target but ≥ threshold → at_risk
 *   - actual < threshold        → breached
 *
 * higher_is_worse: a high actual value is bad (e.g. incident count, error rate)
 *   - actual <= target          → on_track
 *   - actual > target but ≤ threshold → at_risk
 *   - actual > threshold        → breached
 */
export function calculateIndicatorStatus(
  actualValue:    number | null | undefined,
  targetValue:    number,
  alertThreshold: number,
  direction:      IndicatorDirection,
): IndicatorStatus {
  if (actualValue === null || actualValue === undefined) return 'no_data'

  if (direction === 'lower_is_worse') {
    // Lower actual = worse performance
    if (actualValue >= targetValue)     return 'on_track'
    if (actualValue >= alertThreshold)  return 'at_risk'
    return 'breached'
  } else {
    // higher_is_worse: higher actual = worse performance
    if (actualValue <= targetValue)     return 'on_track'
    if (actualValue <= alertThreshold)  return 'at_risk'
    return 'breached'
  }
}

/**
 * Returns true when the actual value has crossed the breach threshold.
 * Used by alert services to determine whether to fire notification emails.
 */
export function isIndicatorBreach(
  actualValue:    number,
  alertThreshold: number,
  direction:      IndicatorDirection,
): boolean {
  if (direction === 'lower_is_worse') return actualValue < alertThreshold
  return actualValue > alertThreshold
}

/**
 * Badge display configuration for each indicator status.
 * Uses Tailwind color tokens from tailwind.config.ts:
 *   ok: #27AE60, warn: #E67E22, err: #E74C3C, paper-border: #D7E2EF
 */
export const INDICATOR_STATUS_BADGE: Record<IndicatorStatus, { label: string; className: string }> = {
  on_track: { label: 'On Track',  className: 'bg-ok/10 text-ok border-ok/30' },
  at_risk:  { label: 'At Risk',   className: 'bg-warn/10 text-warn border-warn/30' },
  breached: { label: 'Breached',  className: 'bg-err/10 text-err border-err/30' },
  no_data:  { label: 'No Data',   className: 'bg-paper text-navy-mid border-paper-border' },
}

export const DIRECTION_LABELS: Record<IndicatorDirection, string> = {
  lower_is_worse:  'Lower is Worse (e.g. pass rate, coverage %)',
  higher_is_worse: 'Higher is Worse (e.g. incident count, error rate)',
}
