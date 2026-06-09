// lib/compliance/pecg-queries.ts
// Query helpers for PECG Act compliance engine
// Mirrors lib/compliance/queries.ts pattern

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { PECGComplianceScore, PECGComplianceCheck, PECGComplianceRule } from '@/types/compliance'

type DbClient = SupabaseClient<Database>

/**
 * Get the latest PECG compliance score for the authenticated user's institution.
 * Returns null if no score exists yet.
 */
export async function getPecgComplianceScore(supabase: DbClient): Promise<PECGComplianceScore | null> {
  const { data, error } = await supabase
    .from('pecg_institution_compliance_scores')
    .select('*')
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  return data as unknown as PECGComplianceScore
}

/**
 * List all PECG compliance checks for the institution.
 * Ordered by checked_at descending (newest first).
 */
export async function listPecgComplianceChecks(supabase: DbClient): Promise<PECGComplianceCheck[]> {
  const { data, error } = await supabase
    .from('pecg_compliance_checks')
    .select('*')
    .order('checked_at', { ascending: false })

  return (data ?? []) as unknown as PECGComplianceCheck[]
}

/**
 * Get compliance checks filtered by status.
 */
export async function getPecgChecksByStatus(
  supabase: DbClient,
  status: string
): Promise<PECGComplianceCheck[]> {
  const { data } = await supabase
    .from('pecg_compliance_checks')
    .select('*')
    .eq('status', status)
    .order('checked_at', { ascending: false })

  return (data ?? []) as unknown as PECGComplianceCheck[]
}

/**
 * Get compliance checks filtered by regulation (PECG_ACT or ZIMCODE).
 */
export async function getPecgChecksByRegulation(
  supabase: DbClient,
  regulation: string
): Promise<PECGComplianceCheck[]> {
  const { data } = await supabase
    .from('pecg_compliance_checks')
    .select('*')
    .eq('regulation', regulation)
    .order('checked_at', { ascending: false })

  return (data ?? []) as unknown as PECGComplianceCheck[]
}

/**
 * Get compliance checks for a specific rule code.
 */
export async function getPecgChecksByRule(
  supabase: DbClient,
  ruleCode: string
): Promise<PECGComplianceCheck[]> {
  const { data } = await supabase
    .from('pecg_compliance_checks')
    .select('*')
    .eq('rule_code', ruleCode)
    .order('checked_at', { ascending: false })

  return (data ?? []) as unknown as PECGComplianceCheck[]
}

/**
 * Get historical compliance scores for trend analysis.
 */
export async function getPecgScoreHistory(
  supabase: DbClient,
  limit: number = 30
): Promise<PECGComplianceScore[]> {
  const { data } = await supabase
    .from('pecg_institution_compliance_scores')
    .select('*')
    .order('score_date', { ascending: false })
    .limit(limit)

  return (data ?? []) as unknown as PECGComplianceScore[]
}

/**
 * Get all active PECG compliance rules.
 */
export async function listPecgRules(supabase: DbClient): Promise<{ data: PECGComplianceRule[]; error: null }> {
  const { data } = await supabase
    .from('pecg_compliance_rules')
    .select('*')
    .eq('is_active', true)
    .order('regulation', { ascending: true })
    .order('severity', { ascending: true })

  return { data: (data ?? []) as unknown as PECGComplianceRule[], error: null }
}
