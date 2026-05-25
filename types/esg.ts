// types/esg.ts
// Phase 12 — ESG module types.

export type EsgCategory = 'Environmental' | 'Social' | 'Governance'

export const ESG_CATEGORIES: EsgCategory[] = ['Environmental', 'Social', 'Governance']

export const ESG_CATEGORY_LABELS: Record<EsgCategory, string> = {
  Environmental: 'Environmental',
  Social:        'Social',
  Governance:    'Governance',
}

export const ESG_CATEGORY_COLORS: Record<EsgCategory, string> = {
  Environmental: '#16a34a',
  Social:        '#2563eb',
  Governance:    '#7c3aed',
}

export interface EsgFramework {
  id:          string
  code:        string
  name:        string
  description: string | null
}

export interface EsgMetric {
  id:             string
  institution_id: string
  framework_id:   string | null
  metric_code:    string
  name:           string
  category:       EsgCategory
  unit:           string
  target_value:   number | null
  description:    string | null
  created_by:     string
  created_at:     string
  updated_at:     string
  // joined
  esg_framework?: { code: string; name: string } | null
}

export interface EsgReading {
  id:             string
  institution_id: string
  metric_id:      string
  period_label:   string
  actual_value:   number
  notes:          string | null
  evidence_url:   string | null
  recorded_by:    string
  created_at:     string
}
