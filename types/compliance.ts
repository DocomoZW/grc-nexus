// types/compliance.ts
// Domain types and label maps for Phase 4 Compliance Management.

export type RegulatoryFramework =
  | 'pecoga'
  | 'ppdpa'
  | 'nds2'
  | 'iso_37000'
  | 'king_iv'
  | 'ipsas'
  | 'pfma'
  | 'other'

export type ObligationStatus =
  | 'pending'
  | 'compliant'
  | 'partially_compliant'
  | 'non_compliant'
  | 'overdue'
  | 'waived'

export type AttestationStatus = 'compliant' | 'partially_compliant' | 'non_compliant'

export const REGULATORY_FRAMEWORK_LABELS: Record<RegulatoryFramework, string> = {
  pecoga:    'PECOGA',
  ppdpa:     'PPDPA',
  nds2:      'NDS2',
  iso_37000: 'ISO 37000',
  king_iv:   'King IV',
  ipsas:     'IPSAS',
  pfma:      'PFMA',
  other:     'Other',
}

export const OBLIGATION_STATUS_LABELS: Record<ObligationStatus, string> = {
  pending:             'Pending',
  compliant:           'Compliant',
  partially_compliant: 'Partially Compliant',
  non_compliant:       'Non-Compliant',
  overdue:             'Overdue',
  waived:              'Waived',
}

export const ATTESTATION_STATUS_LABELS: Record<AttestationStatus, string> = {
  compliant:           'Compliant',
  partially_compliant: 'Partially Compliant',
  non_compliant:       'Non-Compliant',
}

export type PECGRuleCode =
  | 'TERM_LIMIT'
  | 'MEMBERSHIP_LIMIT'
  | 'GENDER_REPRESENTATION'
  | 'CIVIL_SERVANT_RESTRICTION'
  | 'DATABASE_INCLUSION'
  | 'CHAIR_INDEPENDENCE'
  | 'QUARTERLY_MEETINGS'
  | 'AGM_REQUIRED'
  | 'CONFLICT_DISCLOSURE'
  | 'STRATEGIC_PLAN'
  | 'PERFORMANCE_CONTRACT_BOARD'
  | 'PERFORMANCE_CONTRACT_CEO'
  | 'ANNUAL_REVIEW'
  | 'DIRECTOR_DEVELOPMENT'
  | 'BOARD_CHARTER'
  | 'CODE_OF_ETHICS'
  | 'ASSET_DECLARATION'
  | 'RISK_COMMITTEE'
  | 'WHISTLEBLOWING_SYSTEM'
  | 'BOARD_SELF_ASSESSMENT'
  | 'PAY_CAP'
  | 'STANDARDIZED_ALLOWANCES'
  | 'PROHIBITED_LOANS'
  | 'ANNUAL_AUDIT'
  | 'BENEFICIAL_OWNERSHIP'
  | 'ANTI_SELECTIVE_DISCLOSURE'
  | 'INTEGRATED_REPORTING'
  | 'RISK_TOLERANCE'
  | 'VOTING_MECHANISMS'
  | 'EMPLOYEE_SHARE_SCHEMES'
  | 'COMMUNITY_BENEFIT'
  | 'ADR_AVAILABILITY'

export type PECGCheckStatus = 'compliant' | 'non_compliant' | 'at_risk' | 'waived' | 'not_applicable'

export type PECGRuleSeverity = 'info' | 'warning' | 'critical' | 'legal'

export type PECGRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type PECGRegulation = 'PECG_ACT' | 'ZIMCODE'

export const PECG_CHECK_STATUS_LABELS: Record<PECGCheckStatus, string> = {
  compliant: 'Compliant',
  non_compliant: 'Non-Compliant',
  at_risk: 'At Risk',
  waived: 'Waived',
  not_applicable: 'N/A',
}

export const PECG_RULE_SEVERITY_LABELS: Record<PECGRuleSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
  legal: 'Legal',
}

export const PECG_RISK_LEVEL_LABELS: Record<PECGRiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const PECG_CHECK_STATUS_BADGE: Record<PECGCheckStatus, string> = {
  compliant: 'bg-ok/10 text-ok border border-ok/30 rounded-grc-sm px-[8px] py-[4px] text-[14px]',
  non_compliant: 'bg-err/10 text-err border border-err/30 rounded-grc-sm px-[8px] py-[4px] text-[14px] font-semibold',
  at_risk: 'bg-warn/10 text-warn border border-warn/30 rounded-grc-sm px-[8px] py-[4px] text-[14px]',
  waived: 'bg-gray-100 text-gray-500 border border-gray-200 rounded-grc-sm px-[8px] py-[4px] text-[14px]',
  not_applicable: 'bg-paper text-navy-mid border border-paper-border rounded-grc-sm px-[8px] py-[4px] text-[14px]',
}

export const PECG_RISK_LEVEL_BADGE: Record<PECGRiskLevel, string> = {
  low: 'bg-ok/10 text-ok border border-ok/30 rounded-grc-sm px-[8px] py-[4px] text-[14px]',
  medium: 'bg-warn/10 text-warn border border-warn/30 rounded-grc-sm px-[8px] py-[4px] text-[14px]',
  high: 'bg-err/10 text-err border border-err/30 rounded-grc-sm px-[8px] py-[4px] text-[14px] font-semibold',
  critical: 'bg-err/30 text-err border border-err/50 rounded-grc-sm px-[8px] py-[4px] text-[14px] font-semibold',
}

export interface PECGComplianceScore {
  id: string
  institution_id: string
  score_date: string
  overall_score: number
  pecg_act_score: number
  zimcode_score: number
  board_composition_score: number
  performance_management_score: number
  governance_score: number
  meeting_score: number
  disclosure_score: number
  risk_level: PECGRiskLevel
  check_count: number
  compliant_count: number
  non_compliant_count: number
  at_risk_count: number
  calculated_at: string
}

export interface PECGComplianceCheck {
  id: string
  institution_id: string
  rule_code: PECGRuleCode
  rule_name: string
  regulation: PECGRegulation
  status: PECGCheckStatus
  target_id: string | null
  target_type: string | null
  result_details: Record<string, unknown> | null
  due_date: string | null
  checked_at: string
  severity: PECGRuleSeverity
  notes: string | null
}

export interface PECGComplianceRule {
  id: string
  rule_code: PECGRuleCode
  rule_name: string
  regulation: PECGRegulation
  section_ref: string
  description: string
  check_type: string
  severity: PECGRuleSeverity
  is_active: boolean
}

export interface PECGComplianceRuleResult {
  data: PECGComplianceRule[]
  error: null
}

export interface ObligationRow {
  id: string
  framework: RegulatoryFramework
  framework_reference: string | null
  title: string
  owner_id: string | null
  owner_name: string
  due_date: string
  status: ObligationStatus
  evidence_count: number
  created_at: string
}
