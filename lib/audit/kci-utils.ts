// lib/audit/kci-utils.ts
// Re-exports shared indicator utilities for the audit/KCI context.
// KCI uses the same calculation logic as KRI — single source of truth.
export {
  calculateIndicatorStatus,
  isIndicatorBreach,
  INDICATOR_STATUS_BADGE,
  DIRECTION_LABELS,
} from '@/lib/risk/kri-utils'
