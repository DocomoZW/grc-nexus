// types/notifications.ts
// Phase 11 — Notification record types.

export type SourceModule =
  | 'risk'
  | 'compliance'
  | 'kri'
  | 'kci'
  | 'audit'
  | 'incident'
  | 'board'
  | 'system'
  | 'analytics'

export interface Notification {
  id:             string
  institution_id: string
  user_id:        string
  title:          string
  body:           string | null
  link:           string | null
  source_module:  SourceModule | null
  read_at:        string | null
  created_at:     string
}

export const SOURCE_MODULE_LABELS: Record<SourceModule, string> = {
  risk:       'Risk',
  compliance: 'Compliance',
  kri:        'KRI',
  kci:        'KCI',
  audit:      'Audit',
  incident:   'Incident',
  board:      'Board',
  system:     'System',
  analytics: 'Analytics',
}
