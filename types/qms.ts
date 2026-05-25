// types/qms.ts
// Phase 13 — QMS module types.

export type QmsDocType = 'procedure' | 'policy' | 'work_instruction' | 'form' | 'record' | 'manual'
export type QmsDocStatus = 'draft' | 'under_review' | 'approved' | 'obsolete'
export type NcSource = 'internal_audit' | 'external_audit' | 'customer_complaint' | 'process_observation' | 'supplier' | 'other'
export type NcSeverity = 'minor' | 'major' | 'critical'
export type NcStatus = 'open' | 'root_cause_analysis' | 'corrective_action' | 'verification' | 'closed'
export type ReviewStatus = 'planned' | 'in_progress' | 'completed'
export type ActionItemStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export const QMS_DOC_TYPE_LABELS: Record<QmsDocType, string> = {
  procedure:       'Procedure',
  policy:          'Policy',
  work_instruction:'Work Instruction',
  form:            'Form',
  record:          'Record',
  manual:          'Manual',
}

export const QMS_DOC_STATUS_LABELS: Record<QmsDocStatus, string> = {
  draft:        'Draft',
  under_review: 'Under Review',
  approved:     'Approved',
  obsolete:     'Obsolete',
}

export const NC_SOURCE_LABELS: Record<NcSource, string> = {
  internal_audit:      'Internal Audit',
  external_audit:      'External Audit',
  customer_complaint:  'Customer Complaint',
  process_observation: 'Process Observation',
  supplier:            'Supplier',
  other:               'Other',
}

export const NC_SEVERITY_LABELS: Record<NcSeverity, string> = {
  minor:    'Minor',
  major:    'Major',
  critical: 'Critical',
}

export const NC_STATUS_LABELS: Record<NcStatus, string> = {
  open:                'Open',
  root_cause_analysis: 'Root Cause Analysis',
  corrective_action:   'Corrective Action',
  verification:        'Verification',
  closed:              'Closed',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  planned:     'Planned',
  in_progress: 'In Progress',
  completed:   'Completed',
}

export interface QmsDocument {
  id:             string
  institution_id: string
  doc_code:       string
  title:          string
  doc_type:       QmsDocType
  version:        number
  status:         QmsDocStatus
  owner_id:       string | null
  review_due_at:  string | null
  approved_at:    string | null
  file_url:       string | null
  created_by:     string
  created_at:     string
  updated_at:     string
}

export interface NonConformance {
  id:                  string
  institution_id:      string
  nc_number:           string
  title:               string
  description:         string
  source:              NcSource
  severity:            NcSeverity
  status:              NcStatus
  assigned_to:         string | null
  due_date:            string | null
  root_cause:          string | null
  corrective_action:   string | null
  verified_by:         string | null
  verified_at:         string | null
  closed_at:           string | null
  created_by:          string
  created_at:          string
  updated_at:          string
}

export interface ManagementReview {
  id:                          string
  institution_id:              string
  title:                       string
  review_date:                 string
  attendees:                   string[] | null
  qms_performance_summary:     string | null
  customer_feedback_summary:   string | null
  process_performance_summary: string | null
  audit_results_summary:       string | null
  improvement_opportunities:   string | null
  resource_needs:              string | null
  status:                      ReviewStatus
  minutes_url:                 string | null
  created_by:                  string
  created_at:                  string
  updated_at:                  string
}

export interface ReviewActionItem {
  id:             string
  institution_id: string
  review_id:      string
  description:    string
  owner_id:       string | null
  due_date:       string | null
  status:         ActionItemStatus
  completed_at:   string | null
  created_by:     string
  created_at:     string
  updated_at:     string
}
