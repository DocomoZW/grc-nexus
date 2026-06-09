// lib/compliance/pecg-data-provider.ts
// Supabase-based ComplianceDataProvider implementation
// Bridges the PECG engine with the GRC-Nexus database

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type {
  ComplianceDataProvider,
  BoardMember,
  BoardMeeting,
  StrategicPlan,
  PerformanceContract,
  AssetDeclaration,
  Disclosure,
  BoardCharter,
  CodeOfEthics,
  AuditedAccounts,
} from './pecg-types'

type DbClient = SupabaseClient<Database>

export class SupabaseComplianceDataProvider implements ComplianceDataProvider {
  constructor(private supabase: DbClient) {}

  // ============================================================================
  // BOARD MEMBERS
  // ============================================================================

  async getBoardMembers(institutionId: string): Promise<BoardMember[]> {
    // First, try to get from the new board_members table (if migration is applied)
    const { data: boardRows, error: boardError } = await this.supabase
      .from('board_members')
      .select(`
        id, user_id, role, is_chair, is_ceo, is_executive, is_in_database,
        independence_status, independence_rationale, independence_reviewed_at,
        appointed_at, term_years, board_count, appointed_by, qualifications,
        committee_memberships, last_reviewed_at, status,
        user_profiles!user_id(first_name, last_name, gender)
      `)
      .eq('institution_id', institutionId)
      .eq('status', 'active')

    if (boardRows && boardRows.length > 0) {
      return boardRows.map((row) => {
        const profile = row.user_profiles as { first_name?: string | null; last_name?: string | null; gender?: string | null } | null
        return {
          id: row.user_id as string,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          gender: (profile?.gender as 'male' | 'female' | 'other') || 'other',
          isCivilServant: false,
          role: (row.role as string) || 'member',
          appointedAt: (row.appointed_at as string) || new Date().toISOString(),
          termYears: (row.term_years as number) || 0,
          boardCount: (row.board_count as number) || 1,
          isInDatabase: (row.is_in_database as boolean) ?? true,
          isChair: (row.is_chair as boolean) ?? false,
          isCEO: (row.is_ceo as boolean) ?? false,
          isExecutive: (row.is_executive as boolean) ?? false,
          isIndependent: (row.independence_status as string) === 'independent',
          independenceRationale: (row.independence_rationale as string) || null,
          lastReviewedAt: (row.independence_reviewed_at as string) || null,
          appointedBy: (row.appointed_by as string) || null,
          qualifications: (row.qualifications as string[]) || [],
          committeeMemberships: (row.committee_memberships as string[]) || [],
        }
      })
    }

    // Fallback: Get users with board-member or ceo role from user_roles
    const { data: roles } = await this.supabase
      .from('user_roles')
      .select('user_id, role_name')
      .eq('institution_id', institutionId)
      .in('role_name', ['board-member', 'ceo'])

    if (!roles || roles.length === 0) return []

    const userIds = roles.map((r) => r.user_id)
    const roleMap = new Map(roles.map((r) => [r.user_id, r.role_name]))

    const { data: profiles } = await this.supabase
      .from('user_profiles')
      .select('id, first_name, last_name, created_at, updated_at')
      .in('id', userIds)

    if (!profiles) return []

    const members: BoardMember[] = profiles.map((p) => {
      const role = roleMap.get(p.id as string) || 'board-member'
      const isCEO = role === 'ceo'
      return {
        id: p.id as string,
        firstName: p.first_name as string || '',
        lastName: p.last_name as string || '',
        gender: 'other',
        isCivilServant: false,
        role,
        appointedAt: p.created_at as string || new Date().toISOString(),
        termYears: 0,
        boardCount: 1,
        isInDatabase: true,
        isChair: false,
        isCEO,
        isExecutive: isCEO,
        isIndependent: !isCEO,
        independenceRationale: isCEO ? 'CEO role precludes independence' : 'Assumed independent pending review',
        lastReviewedAt: p.updated_at as string || null,
        appointedBy: null,
        qualifications: [],
        committeeMemberships: [],
      }
    })

    return members
  }

  // ============================================================================
  // MEETINGS
  // ============================================================================

  async getMeetingCount(institutionId: string, year: number): Promise<number> {
    const { count } = await this.supabase
      .from('board_meetings')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .gte('meeting_date', `${year}-01-01`)
      .lte('meeting_date', `${year}-12-31`)

    return count ?? 0
  }

  async getLastMeetingDate(institutionId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('board_meetings')
      .select('meeting_date')
      .eq('institution_id', institutionId)
      .order('meeting_date', { ascending: false })
      .limit(1)

    return (data?.[0]?.meeting_date as string | null) ?? null
  }

  async getBoardMeetings(
    institutionId: string,
    startDate: string,
    endDate: string
  ): Promise<BoardMeeting[]> {
    const { data } = await this.supabase
      .from('board_meetings')
      .select('id, meeting_date, status, attendee_ids')
      .eq('institution_id', institutionId)
      .gte('meeting_date', startDate)
      .lte('meeting_date', endDate)
      .order('meeting_date', { ascending: true })

    return (data ?? []).map((m) => ({
      id: m.id as string,
      meetingDate: m.meeting_date as string,
      status: m.status as string,
      attendeeCount: (m.attendee_ids as string[])?.length ?? 0,
      hasCGURepresentative: false, // TODO: Flag CGU attendees
      hasLineMinistry: false, // TODO: Flag ministry attendees
      hasAccountantGeneral: false, // TODO: Flag accountant attendees
    }))
  }

  // ============================================================================
  // STRATEGIC PLANS
  // ============================================================================

  async getStrategicPlan(institutionId: string): Promise<StrategicPlan | null> {
    const { data } = await this.supabase
      .from('pecg_strategic_plans')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) return null

    return {
      id: data.id as string,
      planPeriodStart: parseInt(data.plan_period_start as string, 10) || 0,
      planPeriodEnd: parseInt(data.plan_period_end as string, 10) || 0,
      submittedToMinister: data.submitted_to_minister as boolean,
      submittedToCGU: data.submitted_to_cgu as boolean,
      submittedToFinance: data.submitted_to_finance as boolean,
      submittedAt: data.submitted_at as string | null,
      status: data.status as string,
    }
  }

  // ============================================================================
  // PERFORMANCE CONTRACTS
  // ============================================================================

  async getPerformanceContracts(institutionId: string): Promise<PerformanceContract[]> {
    const { data } = await this.supabase
      .from('pecg_performance_contracts')
      .select('*')
      .eq('institution_id', institutionId)

    return (data ?? []).map((c) => ({
      id: c.id as string,
      contractType: c.contract_type as string,
      employeeId: c.employee_id as string,
      appointedAt: c.appointed_at as string,
      contractDueAt: c.contract_due_at as string,
      contractSignedAt: c.contract_signed_at as string | null,
      status: c.status as string,
      lastReviewedAt: c.last_reviewed_at as string | null,
    }))
  }

  // ============================================================================
  // ASSET DECLARATIONS
  // ============================================================================

  async getAssetDeclarations(
    institutionId: string,
    year: number
  ): Promise<AssetDeclaration[]> {
    const { data } = await this.supabase
      .from('pecg_asset_declarations')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('declaration_year', year)

    return (data ?? []).map((d) => ({
      id: d.id as string,
      boardMemberId: d.board_member_id as string,
      declarationYear: d.declaration_year as number,
      declarationDate: d.declaration_date as string,
      immovableProperties: (d.immovable_properties as unknown[]) ?? [],
      businessInterests: (d.business_interests as unknown[]) ?? [],
      highValueItems: (d.high_value_items as unknown[]) ?? [],
      status: d.status as string,
    }))
  }

  // ============================================================================
  // DISCLOSURES
  // ============================================================================

  async getDisclosures(institutionId: string): Promise<Disclosure[]> {
    const { data } = await this.supabase
      .from('pecg_disclosures')
      .select('*')
      .eq('institution_id', institutionId)

    return (data ?? []).map((d) => ({
      id: d.id as string,
      discloserId: d.discloser_id as string,
      disclosureType: d.disclosure_type as string,
      disclosedAt: d.disclosed_at as string,
      recusedFromDiscussion: d.recused_from_discussion as boolean,
      recusedFromVoting: d.recused_from_voting as boolean,
      status: d.status as string,
    }))
  }

  // ============================================================================
  // GOVERNANCE DOCUMENTS
  // ============================================================================

  async getBoardCharter(institutionId: string): Promise<BoardCharter | null> {
    // TODO: Add dedicated board_charters table in future migration
    // For now, check compliance_obligations for charter evidence
    const { data } = await this.supabase
      .from('compliance_obligations')
      .select('id, framework_reference, status, created_at')
      .eq('institution_id', institutionId)
      .eq('framework', 'pecoga')
      .ilike('title', '%charter%')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) return null

    return {
      id: data.id as string,
      hasVision: data.status === 'compliant',
      hasMission: data.status === 'compliant',
      hasValues: data.status === 'compliant',
      hasRiskAssessment: data.status === 'compliant',
      hasSuccessionPlan: data.status === 'compliant',
      lastReviewedAt: data.created_at as string,
    }
  }

  async getCodeOfEthics(institutionId: string): Promise<CodeOfEthics | null> {
    // TODO: Add dedicated code_of_ethics table in future migration
    const { data } = await this.supabase
      .from('compliance_obligations')
      .select('id, framework_reference, status, created_at')
      .eq('institution_id', institutionId)
      .eq('framework', 'pecoga')
      .ilike('title', '%ethics%')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) return null

    return {
      id: data.id as string,
      hasProfessionalEthics: data.status === 'compliant',
      hasEfficiency: data.status === 'compliant',
      hasTransparency: data.status === 'compliant',
      lastReviewedAt: data.created_at as string,
    }
  }

  // ============================================================================
  // FINANCIAL DATA
  // ============================================================================

  async getAnnualRevenue(institutionId: string, year: number): Promise<number> {
    // TODO: Add financial_data table in future migration
    // For now, return placeholder
    return 0
  }

  async getTotalRemuneration(institutionId: string, year: number): Promise<number> {
    // TODO: Add financial_data table in future migration
    return 0
  }

  async getAuditedAccounts(institutionId: string, year: number): Promise<AuditedAccounts | null> {
    // TODO: Add audited_accounts table in future migration
    return null
  }
}

export function createSupabaseDataProvider(supabase: DbClient): SupabaseComplianceDataProvider {
  return new SupabaseComplianceDataProvider(supabase)
}
