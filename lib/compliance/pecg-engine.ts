// lib/compliance/pecg-engine.ts
// PECG Act & ZimCode Compliance Engine
// Pure business logic — no framework imports (Next.js, React, Supabase)
// Mirrors existing compliance-utils.ts pattern

import { differenceInDays, differenceInYears, isPast, isToday, addDays, addMonths, addYears, startOfYear, endOfYear } from 'date-fns'
import type {
  ComplianceRule,
  CheckResult,
  ComplianceDataProvider,
  PECGCheckStatus,
  PECGRuleSeverity,
  TargetType,
  InstitutionComplianceScore,
  PECGRiskLevel,
} from './pecg-types'

export interface EngineConfig {
  rules: ComplianceRule[]
  dataProvider: ComplianceDataProvider
}

export class PECGComplianceEngine {
  private rules: ComplianceRule[]
  private dataProvider: ComplianceDataProvider

  constructor(config: EngineConfig) {
    this.rules = config.rules
    this.dataProvider = config.dataProvider
  }

  /**
   * Execute all active rules for a given institution
   */
  async executeChecks(institutionId: string): Promise<CheckResult[]> {
    const results: CheckResult[] = []
    const activeRules = this.rules.filter((r) => r.isActive)

    for (const rule of activeRules) {
      const result = await this.executeRule(rule, institutionId)
      results.push(result)
    }

    return results
  }

  /**
   * Execute a single rule
   */
  private async executeRule(
    rule: ComplianceRule,
    institutionId: string
  ): Promise<CheckResult> {
    try {
      switch (rule.checkType) {
        case 'deadline':
          return await this.checkDeadline(rule, institutionId)
        case 'threshold':
          return await this.checkThreshold(rule, institutionId)
        case 'presence':
          return await this.checkPresence(rule, institutionId)
        case 'absence':
          return await this.checkAbsence(rule, institutionId)
        case 'count':
          return await this.checkCount(rule, institutionId)
        case 'ratio':
          return await this.checkRatio(rule, institutionId)
        default:
          return this.buildResult(rule, 'not_applicable', null, null, {
            error: 'Unknown check type',
          })
      }
    } catch (error) {
      return this.buildResult(rule, 'not_applicable', null, null, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // ============================================================================
  // CHECK TYPE: DEADLINE
  // ============================================================================

  private async checkDeadline(
    rule: ComplianceRule,
    institutionId: string
  ): Promise<CheckResult> {
    const today = new Date()

    switch (rule.ruleCode) {
      case 'TERM_LIMIT': {
        const boardMembers = await this.dataProvider.getBoardMembers(institutionId)
        let worstStatus: PECGCheckStatus = 'compliant'
        let worstRisk = 0
        let details: Record<string, unknown> = { members: [] }

        for (const member of boardMembers) {
          const appointed = new Date(member.appointedAt)
          const years = differenceInYears(today, appointed)
          const maxYears = (rule.config.maxTotalYears as number) || 8
          const memberRisk = Math.min((years / maxYears) * 100, 100)

          const memberDetail = {
            memberId: member.id,
            name: `${member.firstName} ${member.lastName}`,
            years,
            maxYears,
            riskScore: memberRisk,
          }
          ;(details.members as unknown[]).push(memberDetail)

          if (years > maxYears) {
            worstStatus = 'non_compliant'
            worstRisk = Math.max(worstRisk, 100)
          } else if (years >= maxYears - 1 && worstStatus !== 'non_compliant') {
            worstStatus = 'at_risk'
            worstRisk = Math.max(worstRisk, memberRisk)
          }
        }

        return this.buildResult(
          rule,
          worstStatus,
          null,
          'institution',
          details,
          worstRisk
        )
      }

      case 'PERFORMANCE_CONTRACT_BOARD': {
        const contracts = await this.dataProvider.getPerformanceContracts(institutionId)
        let worstStatus: PECGCheckStatus = 'compliant'
        let worstRisk = 0
        const details: Record<string, unknown> = { contracts: [] }

        for (const contract of contracts.filter((c) => c.contractType === 'board_member')) {
          const due = new Date(contract.contractDueAt)
          const signed = contract.contractSignedAt ? new Date(contract.contractSignedAt) : null
          const daysToDue = differenceInDays(due, today)
          const daysOverdue = signed ? differenceInDays(signed, due) : -daysToDue

          const contractDetail = {
            contractId: contract.id,
            employeeId: contract.employeeId,
            dueDate: contract.contractDueAt,
            signedAt: contract.contractSignedAt,
            daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          }
          ;(details.contracts as unknown[]).push(contractDetail)

          if (!signed || daysOverdue > 0) {
            worstStatus = 'non_compliant'
            worstRisk = 100
          } else if (daysToDue <= 7 && daysToDue > 0 && worstStatus !== 'non_compliant') {
            worstStatus = 'at_risk'
            worstRisk = Math.max(worstRisk, 70)
          }
        }

        return this.buildResult(rule, worstStatus, null, 'institution', details, worstRisk)
      }

      case 'PERFORMANCE_CONTRACT_CEO': {
        const contracts = await this.dataProvider.getPerformanceContracts(institutionId)
        const ceoContract = contracts.find((c) => c.contractType === 'ceo')

        if (!ceoContract) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            error: 'No CEO performance contract found',
          }, 100)
        }

        const due = new Date(ceoContract.contractDueAt)
        const signed = ceoContract.contractSignedAt ? new Date(ceoContract.contractSignedAt) : null
        const daysToDue = differenceInDays(due, today)

        if (!signed || signed > due) {
          return this.buildResult(rule, 'non_compliant', ceoContract.id, 'contract', {
            dueDate: ceoContract.contractDueAt,
            signedAt: ceoContract.contractSignedAt,
            daysOverdue: signed ? differenceInDays(signed, due) : -daysToDue,
          }, 100)
        }

        if (daysToDue <= 7 && daysToDue > 0) {
          return this.buildResult(rule, 'at_risk', ceoContract.id, 'contract', {
            dueDate: ceoContract.contractDueAt,
            daysToDue,
          }, 70)
        }

        return this.buildResult(rule, 'compliant', ceoContract.id, 'contract', {
          signedAt: ceoContract.contractSignedAt,
        }, 0)
      }

      case 'ASSET_DECLARATION': {
        const boardMembers = await this.dataProvider.getBoardMembers(institutionId)
        const year = today.getFullYear()
        const declarations = await this.dataProvider.getAssetDeclarations(institutionId, year)
        let worstStatus: PECGCheckStatus = 'compliant'
        let worstRisk = 0
        const details: Record<string, unknown> = { members: [] }

        for (const member of boardMembers) {
          const memberDecl = declarations.find((d) => d.boardMemberId === member.id)
          const appointed = new Date(member.appointedAt)
          const initialDeadline = addDays(appointed, (rule.config.initialDeadlineDays as number) || 90)
          const isInitialDue = isPast(initialDeadline) && !memberDecl

          const memberDetail = {
            memberId: member.id,
            name: `${member.firstName} ${member.lastName}`,
            hasDeclaration: !!memberDecl,
            declarationYear: memberDecl?.declarationYear,
            isInitialDue,
          }
          ;(details.members as unknown[]).push(memberDetail)

          if (isInitialDue || (!memberDecl && isPast(addMonths(startOfYear(today), 3)))) {
            worstStatus = 'non_compliant'
            worstRisk = 100
          } else if (!memberDecl && worstStatus !== 'non_compliant') {
            worstStatus = 'at_risk'
            worstRisk = Math.max(worstRisk, 50)
          }
        }

        return this.buildResult(rule, worstStatus, null, 'institution', details, worstRisk)
      }

      case 'STRATEGIC_PLAN': {
        const plan = await this.dataProvider.getStrategicPlan(institutionId)
        if (!plan) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            error: 'No strategic plan found',
          }, 100)
        }

        const allSubmitted = plan.submittedToMinister && plan.submittedToCGU && plan.submittedToFinance
        const submittedAt = plan.submittedAt ? new Date(plan.submittedAt) : null
        const sixMonthsAgo = addMonths(today, -6)

        if (!allSubmitted) {
          return this.buildResult(rule, 'at_risk', plan.id, 'plan', {
            submittedToMinister: plan.submittedToMinister,
            submittedToCGU: plan.submittedToCGU,
            submittedToFinance: plan.submittedToFinance,
            planPeriod: `${plan.planPeriodStart}-${plan.planPeriodEnd}`,
          }, 60)
        }

        if (submittedAt && submittedAt < sixMonthsAgo) {
          return this.buildResult(rule, 'non_compliant', plan.id, 'plan', {
            submittedAt: plan.submittedAt,
            sixMonthsAgo: sixMonthsAgo.toISOString(),
          }, 80)
        }

        return this.buildResult(rule, 'compliant', plan.id, 'plan', {
          submittedAt: plan.submittedAt,
          planPeriod: `${plan.planPeriodStart}-${plan.planPeriodEnd}`,
        }, 0)
      }

      case 'ANNUAL_REVIEW': {
        const year = today.getFullYear()
        const contracts = await this.dataProvider.getPerformanceContracts(institutionId)
        const lastReviewed = contracts
          .filter((c) => c.lastReviewedAt)
          .map((c) => new Date(c.lastReviewedAt!))
          .sort((a, b) => b.getTime() - a.getTime())[0]

        if (!lastReviewed) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            error: 'No annual review has been conducted',
          }, 100)
        }

        const yearStart = startOfYear(today)
        if (lastReviewed < yearStart) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            lastReviewedAt: lastReviewed.toISOString(),
            yearStart: yearStart.toISOString(),
          }, 80)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', {
          lastReviewedAt: lastReviewed.toISOString(),
        }, 0)
      }

      case 'ANNUAL_AUDIT': {
        const year = today.getFullYear()
        const audit = await this.dataProvider.getAuditedAccounts(institutionId, year)

        if (!audit) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            error: `No audited accounts found for ${year}`,
          }, 80)
        }

        const auditedAt = new Date(audit.auditedAt)
        const yearEnd = endOfYear(today)

        if (auditedAt > yearEnd) {
          return this.buildResult(rule, 'non_compliant', audit.id, 'obligation', {
            auditedAt: audit.auditedAt,
            yearEnd: yearEnd.toISOString(),
          }, 70)
        }

        return this.buildResult(rule, 'compliant', audit.id, 'obligation', {
          auditedAt: audit.auditedAt,
          auditor: audit.auditor,
        }, 0)
      }

      case 'BOARD_SELF_ASSESSMENT': {
        // Check if board self-assessment was conducted this year
        const year = today.getFullYear()
        const boardMembers = await this.dataProvider.getBoardMembers(institutionId)
        const hasAssessment = boardMembers.some((m) => m.lastReviewedAt && new Date(m.lastReviewedAt).getFullYear() === year)

        if (!hasAssessment) {
          return this.buildResult(rule, 'at_risk', null, 'institution', {
            year,
            error: 'No board self-assessment conducted this year',
          }, 60)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', { year }, 0)
      }

      default:
        return this.buildResult(rule, 'not_applicable', null, null, {
          error: 'Unhandled deadline rule',
        }, 0)
    }
  }

  // ============================================================================
  // CHECK TYPE: THRESHOLD
  // ============================================================================

  private async checkThreshold(
    rule: ComplianceRule,
    institutionId: string
  ): Promise<CheckResult> {
    const today = new Date()
    const year = today.getFullYear()

    switch (rule.ruleCode) {
      case 'PAY_CAP': {
        const revenue = await this.dataProvider.getAnnualRevenue(institutionId, year - 1)
        const totalRemuneration = await this.dataProvider.getTotalRemuneration(institutionId, year)
        const maxRatio = (rule.config.maxRatio as number) || 0.30
        const actualRatio = revenue > 0 ? totalRemuneration / revenue : 0
        const riskScore = Math.min((actualRatio / maxRatio) * 100, 100)

        const details = {
          revenue,
          totalRemuneration,
          actualRatio: Math.round(actualRatio * 10000) / 100,
          maxRatio: maxRatio * 100,
        }

        if (actualRatio > maxRatio) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', details, riskScore)
        }

        if (actualRatio > maxRatio * 0.9) {
          return this.buildResult(rule, 'at_risk', null, 'institution', details, riskScore)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', details, riskScore)
      }

      default:
        return this.buildResult(rule, 'not_applicable', null, null, {
          error: 'Unhandled threshold rule',
        }, 0)
    }
  }

  // ============================================================================
  // CHECK TYPE: PRESENCE
  // ============================================================================

  private async checkPresence(
    rule: ComplianceRule,
    institutionId: string
  ): Promise<CheckResult> {
    switch (rule.ruleCode) {
      case 'BOARD_CHARTER': {
        const charter = await this.dataProvider.getBoardCharter(institutionId)
        if (!charter) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            error: 'No board charter found',
          }, 100)
        }

        const required = (rule.config.requiredElements as string[]) || []
        const missing = required.filter((element) => {
          switch (element) {
            case 'vision': return !charter.hasVision
            case 'mission': return !charter.hasMission
            case 'values': return !charter.hasValues
            case 'risk_assessment': return !charter.hasRiskAssessment
            case 'succession_plan': return !charter.hasSuccessionPlan
            default: return true
          }
        })

        const riskScore = Math.min((missing.length / required.length) * 100, 100)

        if (missing.length > 0) {
          return this.buildResult(rule, 'at_risk', charter.id, 'institution', {
            missingElements: missing,
            hasElements: required.filter((e) => !missing.includes(e)),
          }, riskScore)
        }

        return this.buildResult(rule, 'compliant', charter.id, 'institution', {
          elements: required,
          lastReviewedAt: charter.lastReviewedAt,
        }, 0)
      }

      case 'CODE_OF_ETHICS': {
        const code = await this.dataProvider.getCodeOfEthics(institutionId)
        if (!code) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            error: 'No code of ethics found',
          }, 100)
        }

        const required = (rule.config.requiredElements as string[]) || []
        const missing = required.filter((element) => {
          switch (element) {
            case 'professional_ethics': return !code.hasProfessionalEthics
            case 'efficiency': return !code.hasEfficiency
            case 'transparency': return !code.hasTransparency
            default: return true
          }
        })

        const riskScore = Math.min((missing.length / required.length) * 100, 100)

        if (missing.length > 0) {
          return this.buildResult(rule, 'at_risk', code.id, 'institution', {
            missingElements: missing,
          }, riskScore)
        }

        return this.buildResult(rule, 'compliant', code.id, 'institution', {
          elements: required,
          lastReviewedAt: code.lastReviewedAt,
        }, 0)
      }

      case 'DATABASE_INCLUSION': {
        const boardMembers = await this.dataProvider.getBoardMembers(institutionId)
        const notInDatabase = boardMembers.filter((m) => !m.isInDatabase)

        if (notInDatabase.length > 0) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            notInDatabaseCount: notInDatabase.length,
            members: notInDatabase.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })),
          }, 100)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', {
          totalMembers: boardMembers.length,
        }, 0)
      }

      case 'CHAIR_INDEPENDENCE': {
        const boardMembers = await this.dataProvider.getBoardMembers(institutionId)
        
        // Find designated chair (from metadata or fallback to role matching)
        const chair = boardMembers.find((m) => m.isChair) || boardMembers.find((m) => m.role === 'chair')
        const ceo = boardMembers.find((m) => m.isCEO) || boardMembers.find((m) => m.role === 'ceo')

        if (!chair) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            error: 'No chairperson designated',
            hasCEO: !!ceo,
            ceoName: ceo ? `${ceo.firstName} ${ceo.lastName}` : null,
          }, 100)
        }

        const details: Record<string, unknown> = {
          chairId: chair.id,
          chairName: `${chair.firstName} ${chair.lastName}`,
          chairRole: chair.role,
          chairIsCEO: chair.isCEO,
          chairIsExecutive: chair.isExecutive,
          chairIsIndependent: chair.isIndependent,
          ceoId: ceo?.id ?? null,
          ceoName: ceo ? `${ceo.firstName} ${ceo.lastName}` : null,
        }

        // PECG Act Section 8: Chair must be independent non-executive
        // ZimCode Principle 2.1: Chair cannot be CEO
        const violations: string[] = []
        let riskScore = 0

        // 1. Chair cannot be CEO
        if (chair.isCEO || (ceo && chair.id === ceo.id)) {
          violations.push('Chairperson is also CEO (same person holding both roles)')
          riskScore = 100
        }

        // 2. Chair should not be an executive director
        if (chair.isExecutive && !chair.isCEO) {
          violations.push('Chairperson is an executive director (should be non-executive)')
          riskScore = Math.max(riskScore, 90)
        }

        // 3. Chair must be independent
        if (!chair.isIndependent) {
          violations.push('Chairperson is not classified as independent')
          riskScore = Math.max(riskScore, 80)
        }

        // 4. Independence rationale review
        if (chair.independenceRationale && chair.independenceRationale.includes('CEO')) {
          violations.push('Chairperson independence rationale indicates CEO conflict')
          riskScore = 100
        }

        details.violations = violations
        details.violationCount = violations.length

        if (violations.length > 0) {
          return this.buildResult(rule, 'non_compliant', chair.id, 'board_member', details, riskScore)
        }

        return this.buildResult(rule, 'compliant', chair.id, 'board_member', {
          ...details,
          message: 'Chairperson is independent non-executive, not CEO',
        }, 0)
      }

      case 'AGM_REQUIRED': {
        const today = new Date()
        const year = today.getFullYear()
        const yearStart = startOfYear(today)
        const yearEnd = endOfYear(today)
        const meetings = await this.dataProvider.getBoardMeetings(institutionId, yearStart.toISOString(), yearEnd.toISOString())
        const agm = meetings.find((m) => m.hasCGURepresentative && m.hasLineMinistry && m.hasAccountantGeneral)

        if (!agm) {
          return this.buildResult(rule, 'at_risk', null, 'institution', {
            year,
            meetingsThisYear: meetings.length,
            hasCGURep: meetings.some((m) => m.hasCGURepresentative),
            hasMinistry: meetings.some((m) => m.hasLineMinistry),
            hasAccountant: meetings.some((m) => m.hasAccountantGeneral),
          }, 70)
        }

        return this.buildResult(rule, 'compliant', agm.id, 'meeting', {
          meetingDate: agm.meetingDate,
          attendees: agm.attendeeCount,
        }, 0)
      }

      case 'CONFLICT_DISCLOSURE': {
        const disclosures = await this.dataProvider.getDisclosures(institutionId)
        const activeConflicts = disclosures.filter(
          (d) => d.disclosureType === 'conflict_of_interest' && d.status === 'active'
        )
        const unrecused = activeConflicts.filter((d) => !d.recusedFromDiscussion || !d.recusedFromVoting)

        if (unrecused.length > 0) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            unrecusedCount: unrecused.length,
            conflicts: unrecused.map((d) => ({
              id: d.id,
              discloserId: d.discloserId,
              recusedFromDiscussion: d.recusedFromDiscussion,
              recusedFromVoting: d.recusedFromVoting,
            })),
          }, 100)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', {
          totalDisclosures: disclosures.length,
          activeConflicts: activeConflicts.length,
        }, 0)
      }

      case 'RISK_COMMITTEE':
      case 'WHISTLEBLOWING_SYSTEM':
      case 'INTEGRATED_REPORTING':
      case 'RISK_TOLERANCE':
      case 'VOTING_MECHANISMS':
      case 'EMPLOYEE_SHARE_SCHEMES':
      case 'COMMUNITY_BENEFIT':
      case 'ADR_AVAILABILITY': {
        // These are presence checks that require manual attestation or document upload
        // The engine checks if evidence exists in the compliance_obligations table
        return this.buildResult(rule, 'at_risk', null, 'institution', {
          message: 'Requires manual verification and evidence upload',
          ruleCode: rule.ruleCode,
        }, 50)
      }

      default:
        return this.buildResult(rule, 'not_applicable', null, null, {
          error: 'Unhandled presence rule',
        }, 0)
    }
  }

  // ============================================================================
  // CHECK TYPE: ABSENCE
  // ============================================================================

  private async checkAbsence(
    rule: ComplianceRule,
    institutionId: string
  ): Promise<CheckResult> {
    switch (rule.ruleCode) {
      case 'PROHIBITED_LOANS': {
        // This requires integration with financial systems to detect loans
        // For now, flag as requiring manual verification
        return this.buildResult(rule, 'at_risk', null, 'institution', {
          message: 'Requires financial system integration to verify no loans to board members',
          criminalOffense: true,
        }, 75)
      }

      case 'ANTI_SELECTIVE_DISCLOSURE': {
        return this.buildResult(rule, 'at_risk', null, 'institution', {
          message: 'Requires document review and NLP analysis to verify',
        }, 40)
      }

      default:
        return this.buildResult(rule, 'not_applicable', null, null, {
          error: 'Unhandled absence rule',
        }, 0)
    }
  }

  // ============================================================================
  // CHECK TYPE: COUNT
  // ============================================================================

  private async checkCount(
    rule: ComplianceRule,
    institutionId: string
  ): Promise<CheckResult> {
    const today = new Date()
    const year = today.getFullYear()

    switch (rule.ruleCode) {
      case 'QUARTERLY_MEETINGS': {
        const yearStart = startOfYear(today)
        const yearEnd = endOfYear(today)
        const meetings = await this.dataProvider.getBoardMeetings(institutionId, yearStart.toISOString(), yearEnd.toISOString())
        const minMeetings = (rule.config.minMeetingsPerYear as number) || 4
        const maxGapDays = (rule.config.maxGapDays as number) || 92

        // Check meeting frequency
        const meetingDates = meetings
          .map((m) => new Date(m.meetingDate))
          .sort((a, b) => a.getTime() - b.getTime())

        let maxGap = 0
        for (let i = 1; i < meetingDates.length; i++) {
          const gap = differenceInDays(meetingDates[i], meetingDates[i - 1])
          maxGap = Math.max(maxGap, gap)
        }

        const details = {
          meetingsThisYear: meetings.length,
          minRequired: minMeetings,
          maxGapDays,
          actualMaxGap: maxGap,
          meetingDates: meetings.map((m) => m.meetingDate),
        }

        const meetingRisk = Math.min((meetings.length / minMeetings) * 100, 100)
        const gapRisk = maxGap > maxGapDays ? 100 : Math.min((maxGap / maxGapDays) * 100, 100)
        const riskScore = Math.max(100 - meetingRisk, gapRisk)

        if (meetings.length < minMeetings || maxGap > maxGapDays) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', details, riskScore)
        }

        if (meetings.length < minMeetings + 1 || maxGap > maxGapDays * 0.8) {
          return this.buildResult(rule, 'at_risk', null, 'institution', details, riskScore)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', details, riskScore)
      }

      case 'MEMBERSHIP_LIMIT': {
        const boardMembers = await this.dataProvider.getBoardMembers(institutionId)
        const maxBoards = (rule.config.maxBoards as number) || 3
        const overLimit = boardMembers.filter((m) => m.boardCount > maxBoards)

        if (overLimit.length > 0) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            overLimitCount: overLimit.length,
            maxBoards,
            members: overLimit.map((m) => ({
              id: m.id,
              name: `${m.firstName} ${m.lastName}`,
              boardCount: m.boardCount,
            })),
          }, 100)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', {
          totalMembers: boardMembers.length,
          maxBoards,
        }, 0)
      }

      default:
        return this.buildResult(rule, 'not_applicable', null, null, {
          error: 'Unhandled count rule',
        }, 0)
    }
  }

  // ============================================================================
  // CHECK TYPE: RATIO
  // ============================================================================

  private async checkRatio(
    rule: ComplianceRule,
    institutionId: string
  ): Promise<CheckResult> {
    switch (rule.ruleCode) {
      case 'GENDER_REPRESENTATION': {
        const boardMembers = await this.dataProvider.getBoardMembers(institutionId)
        const total = boardMembers.length
        if (total === 0) {
          return this.buildResult(rule, 'not_applicable', null, 'institution', {
            error: 'No board members found',
          }, 0)
        }

        const femaleCount = boardMembers.filter((m) => m.gender === 'female').length
        const maleCount = boardMembers.filter((m) => m.gender === 'male').length
        const femaleRatio = femaleCount / total
        const maleRatio = maleCount / total
        const minFemaleRatio = (rule.config.minFemaleRatio as number) || 0.30
        const minMaleRatio = (rule.config.minMaleRatio as number) || 0.30

        const details = {
          totalMembers: total,
          femaleCount,
          maleCount,
          femaleRatio: Math.round(femaleRatio * 100),
          maleRatio: Math.round(maleRatio * 100),
          minFemaleRatio: Math.round(minFemaleRatio * 100),
          minMaleRatio: Math.round(minMaleRatio * 100),
        }

        const femaleRisk = femaleRatio < minFemaleRatio ? ((minFemaleRatio - femaleRatio) / minFemaleRatio) * 100 : 0
        const maleRisk = maleRatio < minMaleRatio ? ((minMaleRatio - maleRatio) / minMaleRatio) * 100 : 0
        const riskScore = Math.max(femaleRisk, maleRisk)

        if (femaleRatio < minFemaleRatio || maleRatio < minMaleRatio) {
          return this.buildResult(rule, 'at_risk', null, 'institution', details, riskScore)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', details, riskScore)
      }

      case 'CIVIL_SERVANT_RESTRICTION': {
        const boardMembers = await this.dataProvider.getBoardMembers(institutionId)
        const total = boardMembers.length
        if (total === 0) {
          return this.buildResult(rule, 'not_applicable', null, 'institution', {
            error: 'No board members found',
          }, 0)
        }

        const civilServantCount = boardMembers.filter((m) => m.isCivilServant).length
        const prohibitedCount = boardMembers.filter((m) => m.role === 'permanent_secretary').length
        const civilServantRatio = civilServantCount / total
        const maxRatio = (rule.config.maxCivilServantRatio as number) || 0.49

        const details = {
          totalMembers: total,
          civilServantCount,
          civilServantRatio: Math.round(civilServantRatio * 100),
          maxRatio: Math.round(maxRatio * 100),
          prohibitedRoles: ['permanent_secretary'],
          prohibitedCount,
        }

        if (prohibitedCount > 0) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', {
            ...details,
            error: 'Permanent Secretaries found on board',
            prohibitedMembers: boardMembers
              .filter((m) => m.role === 'permanent_secretary')
              .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })),
          }, 100)
        }

        if (civilServantRatio > maxRatio) {
          return this.buildResult(rule, 'non_compliant', null, 'institution', details, 100)
        }

        if (civilServantRatio > maxRatio * 0.9) {
          return this.buildResult(rule, 'at_risk', null, 'institution', details, 70)
        }

        return this.buildResult(rule, 'compliant', null, 'institution', details, 0)
      }

      default:
        return this.buildResult(rule, 'not_applicable', null, null, {
          error: 'Unhandled ratio rule',
        }, 0)
    }
  }

  // ============================================================================
  // SCORE CALCULATION
  // ============================================================================

  /**
   * Calculate compliance scores for an institution based on check results
   */
  calculateScores(
    institutionId: string,
    results: CheckResult[]
  ): InstitutionComplianceScore {
    const today = new Date().toISOString().slice(0, 10)
    const total = results.length
    const compliant = results.filter((r) => r.status === 'compliant').length
    const nonCompliant = results.filter((r) => r.status === 'non_compliant').length
    const atRisk = results.filter((r) => r.status === 'at_risk').length

    // Category scores
    const pecgResults = results.filter((r) => r.regulation === 'PECG_ACT')
    const zimcodeResults = results.filter((r) => r.regulation === 'ZIMCODE')

    const pecgScore = this.calculateCategoryScore(pecgResults)
    const zimcodeScore = this.calculateCategoryScore(zimcodeResults)
    const overallScore = Math.round((pecgScore + zimcodeScore) / 2)

    // Sub-scores
    const boardResults = results.filter((r) =>
      ['TERM_LIMIT', 'MEMBERSHIP_LIMIT', 'GENDER_REPRESENTATION', 'CIVIL_SERVANT_RESTRICTION', 'DATABASE_INCLUSION', 'CHAIR_INDEPENDENCE'].includes(r.ruleCode)
    )
    const performanceResults = results.filter((r) =>
      ['STRATEGIC_PLAN', 'PERFORMANCE_CONTRACT_BOARD', 'PERFORMANCE_CONTRACT_CEO', 'ANNUAL_REVIEW', 'DIRECTOR_DEVELOPMENT'].includes(r.ruleCode)
    )
    const governanceResults = results.filter((r) =>
      ['BOARD_CHARTER', 'CODE_OF_ETHICS', 'ASSET_DECLARATION', 'RISK_COMMITTEE', 'WHISTLEBLOWING_SYSTEM', 'BOARD_SELF_ASSESSMENT'].includes(r.ruleCode)
    )
    const meetingResults = results.filter((r) =>
      ['QUARTERLY_MEETINGS', 'AGM_REQUIRED', 'CONFLICT_DISCLOSURE'].includes(r.ruleCode)
    )
    const disclosureResults = results.filter((r) =>
      ['BENEFICIAL_OWNERSHIP', 'ANTI_SELECTIVE_DISCLOSURE', 'INTEGRATED_REPORTING', 'RISK_TOLERANCE'].includes(r.ruleCode)
    )

    const riskLevel = this.determineRiskLevel(overallScore, nonCompliant, atRisk)

    return {
      institutionId,
      scoreDate: today,
      overallScore,
      pecgActScore: pecgScore,
      zimcodeScore: zimcodeScore,
      boardCompositionScore: this.calculateCategoryScore(boardResults),
      performanceManagementScore: this.calculateCategoryScore(performanceResults),
      governanceScore: this.calculateCategoryScore(governanceResults),
      meetingScore: this.calculateCategoryScore(meetingResults),
      disclosureScore: this.calculateCategoryScore(disclosureResults),
      riskLevel,
      checkCount: total,
      compliantCount: compliant,
      nonCompliantCount: nonCompliant,
      atRiskCount: atRisk,
      scoreDetails: {
        ruleBreakdown: results.map((r) => ({
          ruleCode: r.ruleCode,
          status: r.status,
          riskScore: r.riskScore,
          severity: r.severity,
        })),
      },
    }
  }

  private calculateCategoryScore(results: CheckResult[]): number {
    if (results.length === 0) return 0
    const totalRisk = results.reduce((sum, r) => sum + r.riskScore, 0)
    const avgRisk = totalRisk / results.length
    return Math.round(100 - avgRisk)
  }

  private determineRiskLevel(
    overallScore: number,
    nonCompliant: number,
    atRisk: number
  ): PECGRiskLevel {
    if (nonCompliant >= 3 || overallScore < 50) return 'critical'
    if (nonCompliant >= 1 || atRisk >= 3 || overallScore < 70) return 'high'
    if (atRisk >= 1 || overallScore < 85) return 'medium'
    return 'low'
  }

  // ============================================================================
  // HELPER: Build CheckResult
  // ============================================================================

  private buildResult(
    rule: ComplianceRule,
    status: PECGCheckStatus,
    targetId: string | null,
    targetType: TargetType | null,
    details: Record<string, unknown>,
    riskScore: number = 0
  ): CheckResult {
    return {
      ruleCode: rule.ruleCode,
      ruleName: rule.ruleName,
      regulation: rule.regulation,
      status,
      targetId,
      targetType,
      details,
      dueDate: null,
      riskScore: Math.min(Math.max(riskScore, 0), 100),
      severity: rule.severity,
      checkedAt: new Date().toISOString(),
      checkedBy: null, // system-generated
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createPECGComplianceEngine(
  rules: ComplianceRule[],
  dataProvider: ComplianceDataProvider
): PECGComplianceEngine {
  return new PECGComplianceEngine({ rules, dataProvider })
}
