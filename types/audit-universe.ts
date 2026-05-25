// types/audit-universe.ts
// Phase 10 Audit Universe type definitions.

export type AuditPlanStatus =
  | 'draft'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type AuditEngagementStatus =
  | 'planned'
  | 'fieldwork'
  | 'reporting'
  | 'completed'
  | 'cancelled'

export type AuditProcedureResult =
  | 'not_started'
  | 'pass'
  | 'fail'
  | 'exception'
  | 'not_applicable'

export const AUDIT_PLAN_STATUS_LABELS: Record<AuditPlanStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const AUDIT_ENGAGEMENT_STATUS_LABELS: Record<AuditEngagementStatus, string> = {
  planned: 'Planned',
  fieldwork: 'Fieldwork',
  reporting: 'Reporting',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const AUDIT_PROCEDURE_RESULT_LABELS: Record<AuditProcedureResult, string> = {
  not_started: 'Not Started',
  pass: 'Pass',
  fail: 'Fail',
  exception: 'Exception',
  not_applicable: 'N/A',
}
