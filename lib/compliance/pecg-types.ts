// lib/compliance/pecg-types.ts
// PECG Act & ZimCode compliance engine types
// Pure TypeScript — no framework imports

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

export type CheckType = 'deadline' | 'threshold' | 'presence' | 'absence' | 'count' | 'ratio'

export type TargetType = 'board_member' | 'meeting' | 'obligation' | 'declaration' | 'disclosure' | 'contract' | 'plan' | 'institution'

export interface ComplianceRule {
  id: string
  ruleCode: PECGRuleCode
  ruleName: string
  regulation: 'PECG_ACT' | 'ZIMCODE'
  sectionRef: string
  description: string
  checkType: CheckType
  config: Record<string, unknown>
  severity: PECGRuleSeverity
  isActive: boolean
}

export interface CheckResult {
  ruleCode: PECGRuleCode
  ruleName: string
  regulation: 'PECG_ACT' | 'ZIMCODE'
  status: PECGCheckStatus
  targetId: string | null
  targetType: TargetType | null
  details: Record<string, unknown>
  dueDate: string | null
  riskScore: number // 0-100
  severity: PECGRuleSeverity
  checkedAt: string
  checkedBy: string | null
}

export interface InstitutionComplianceScore {
  institutionId: string
  scoreDate: string
  overallScore: number
  pecgActScore: number
  zimcodeScore: number
  boardCompositionScore: number
  performanceManagementScore: number
  governanceScore: number
  meetingScore: number
  disclosureScore: number
  riskLevel: PECGRiskLevel
  checkCount: number
  compliantCount: number
  nonCompliantCount: number
  atRiskCount: number
  scoreDetails: Record<string, unknown>
}

export interface ComplianceDataProvider {
  // Board data
  getBoardMembers(institutionId: string): Promise<BoardMember[]>
  getMeetingCount(institutionId: string, year: number): Promise<number>
  getLastMeetingDate(institutionId: string): Promise<string | null>
  getBoardMeetings(institutionId: string, startDate: string, endDate: string): Promise<BoardMeeting[]>

  // Performance data
  getStrategicPlan(institutionId: string): Promise<StrategicPlan | null>
  getPerformanceContracts(institutionId: string): Promise<PerformanceContract[]>

  // Governance data
  getAssetDeclarations(institutionId: string, year: number): Promise<AssetDeclaration[]>
  getDisclosures(institutionId: string): Promise<Disclosure[]>
  getBoardCharter(institutionId: string): Promise<BoardCharter | null>
  getCodeOfEthics(institutionId: string): Promise<CodeOfEthics | null>

  // Financial data
  getAnnualRevenue(institutionId: string, year: number): Promise<number>
  getTotalRemuneration(institutionId: string, year: number): Promise<number>
  getAuditedAccounts(institutionId: string, year: number): Promise<AuditedAccounts | null>
}

export interface BoardMember {
  id: string
  firstName: string
  lastName: string
  gender: 'male' | 'female' | 'other'
  isCivilServant: boolean
  role: string
  appointedAt: string
  termYears: number
  boardCount: number
  isInDatabase: boolean
  // ── Metadata for compliance engine ──
  isChair: boolean
  isCEO: boolean
  isExecutive: boolean
  isIndependent: boolean
  independenceRationale: string | null
  lastReviewedAt: string | null
  appointedBy: string | null
  qualifications: string[]
  committeeMemberships: string[]
}

export interface BoardMeeting {
  id: string
  meetingDate: string
  status: string
  attendeeCount: number
  hasCGURepresentative: boolean
  hasLineMinistry: boolean
  hasAccountantGeneral: boolean
}

export interface StrategicPlan {
  id: string
  planPeriodStart: number
  planPeriodEnd: number
  submittedToMinister: boolean
  submittedToCGU: boolean
  submittedToFinance: boolean
  submittedAt: string | null
  status: string
}

export interface PerformanceContract {
  id: string
  contractType: string
  employeeId: string
  appointedAt: string
  contractDueAt: string
  contractSignedAt: string | null
  status: string
  lastReviewedAt: string | null
}

export interface AssetDeclaration {
  id: string
  boardMemberId: string
  declarationYear: number
  declarationDate: string
  immovableProperties: unknown[]
  businessInterests: unknown[]
  highValueItems: unknown[]
  status: string
}

export interface Disclosure {
  id: string
  discloserId: string
  disclosureType: string
  disclosedAt: string
  recusedFromDiscussion: boolean
  recusedFromVoting: boolean
  status: string
}

export interface BoardCharter {
  id: string
  hasVision: boolean
  hasMission: boolean
  hasValues: boolean
  hasRiskAssessment: boolean
  hasSuccessionPlan: boolean
  lastReviewedAt: string | null
}

export interface CodeOfEthics {
  id: string
  hasProfessionalEthics: boolean
  hasEfficiency: boolean
  hasTransparency: boolean
  lastReviewedAt: string | null
}

export interface AuditedAccounts {
  id: string
  auditYear: number
  auditedAt: string
  auditor: string
  status: string
}

export interface Anomaly {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  riskScore: number
}

export interface RiskPrediction {
  type: string
  probability: number // 0-1
  impact: number // 0-1
  timeframe: string
  description: string
}

export interface InstitutionRiskProfile {
  institutionId: string
  overallRiskScore: number
  complianceRiskScore: number
  governanceRiskScore: number
  financialRiskScore: number
  trend: 'improving' | 'stable' | 'deteriorating'
  predictions: RiskPrediction[]
  anomalies: Anomaly[]
}
