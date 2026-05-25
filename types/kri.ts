// types/kri.ts
// TypeScript types for the KRI (Key Risk Indicator) module.
// Mirror Postgres column names exactly (snake_case). No TypeScript enum keyword.

export type IndicatorStatus    = 'on_track' | 'at_risk' | 'breached' | 'no_data'
export type IndicatorDirection = 'lower_is_worse' | 'higher_is_worse'
export type KpiFrequency       = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export interface KriDefinition {
  id:                  string
  institution_id:      string
  risk_id:             string | null
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

export interface KriReading {
  id:             string
  institution_id: string
  kri_id:         string
  period_start:   string
  period_end:     string
  actual_value:   number
  status:         IndicatorStatus
  notes:          string | null
  recorded_by:    string | null
  recorded_at:    string
}
