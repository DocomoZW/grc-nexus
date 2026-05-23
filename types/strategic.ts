// types/strategic.ts
// TypeScript types for the Strategic Planning module.
// Mirror Postgres column names exactly (snake_case). No TypeScript enum keyword.

export type ObjectiveStatus = 'draft' | 'active' | 'at_risk' | 'completed' | 'cancelled'
export type KpiFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export type Nds2Pillar =
  | 'economic_transformation'
  | 'social_development'
  | 'infrastructure_development'
  | 'environmental_sustainability'
  | 'governance_and_institutions'
  | 'innovation_and_technology'
  | 'regional_and_international_integration'
  | 'rural_and_urban_development'

export const NDS2_PILLAR_LABELS: Record<Nds2Pillar, string> = {
  economic_transformation:                 'Economic Transformation',
  social_development:                      'Social Development',
  infrastructure_development:              'Infrastructure Development',
  environmental_sustainability:            'Environmental Sustainability',
  governance_and_institutions:             'Governance & Institutions',
  innovation_and_technology:               'Innovation & Technology',
  regional_and_international_integration:  'Regional & International Integration',
  rural_and_urban_development:             'Rural & Urban Development',
}

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  draft:     'Draft',
  active:    'Active',
  at_risk:   'At Risk',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const KPI_FREQUENCY_LABELS: Record<KpiFrequency, string> = {
  monthly:     'Monthly',
  quarterly:   'Quarterly',
  semi_annual: 'Semi-Annual',
  annual:      'Annual',
}

export interface StrategicObjective {
  id: string
  institution_id: string
  title: string
  description: string | null
  owner_id: string | null
  start_date: string | null
  target_date: string | null
  status: ObjectiveStatus
  nds2_pillar: Nds2Pillar | null
  institutional_goal: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Kpi {
  id: string
  institution_id: string
  objective_id: string
  title: string
  description: string | null
  owner_id: string | null
  baseline_value: number
  target_value: number
  unit_of_measure: string
  reporting_frequency: KpiFrequency
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface KpiReading {
  id: string
  institution_id: string
  kpi_id: string
  reporting_period: string
  actual_value: number
  notes: string | null
  recorded_by: string | null
  recorded_at: string
}
