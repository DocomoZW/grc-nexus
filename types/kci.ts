// types/kci.ts
// TypeScript types for the KCI (Key Control Indicator) module.
// Mirror Postgres column names exactly (snake_case). No TypeScript enum keyword.

import type { IndicatorStatus, IndicatorDirection, KpiFrequency } from '@/types/kri'
export type { IndicatorStatus, IndicatorDirection, KpiFrequency }

export interface KciDefinition {
  id:                  string
  institution_id:      string
  treatment_id:        string | null
  title:               string
  description:         string | null
  unit_of_measure:     string
  target_value:        number
  alert_threshold:     number
  direction:           IndicatorDirection
  owner_id:            string | null
  reporting_frequency: KpiFrequency
  created_by:          string | null
  created_at:          string
  updated_at:          string
}

export interface KciReading {
  id:             string
  institution_id: string
  kci_id:         string
  period_start:   string
  period_end:     string
  actual_value:   number
  status:         IndicatorStatus
  notes:          string | null
  recorded_by:    string | null
  recorded_at:    string
}
