// lib/audit/universe-queries.ts
// Server-side query helpers for Phase 10 Audit Universe pages.
// Imported by Server Components — NOT Server Actions.

import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Audit Plans ─────────────────────────────────────────────────────────────

export async function listAuditPlans(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('audit_plans')
    .select('id, title, plan_year, status, created_at')
    .order('plan_year', { ascending: false })
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function getAuditPlanById(supabase: SupabaseClient, planId: string) {
  const { data, error } = await supabase
    .from('audit_plans')
    .select(
      `
      id,
      institution_id,
      title,
      description,
      plan_year,
      status,
      approved_by,
      approved_at,
      created_at,
      updated_at,
      audit_engagements (
        id,
        title,
        auditee_dept,
        status,
        planned_start,
        planned_end,
        lead_auditor_id,
        user_profiles!lead_auditor_id ( first_name, last_name )
      )
      `
    )
    .eq('id', planId)
    .single()

  return { data, error }
}

// ─── Audit Engagements ───────────────────────────────────────────────────────

export async function getAuditEngagementById(supabase: SupabaseClient, engagementId: string) {
  const { data, error } = await supabase
    .from('audit_engagements')
    .select(
      `
      id,
      institution_id,
      plan_id,
      title,
      description,
      auditee_dept,
      lead_auditor_id,
      status,
      planned_start,
      planned_end,
      actual_start,
      actual_end,
      opinion,
      created_at,
      updated_at,
      user_profiles!lead_auditor_id ( first_name, last_name ),
      audit_test_procedures (
        id,
        step_number,
        objective,
        procedure_text,
        result,
        performed_by,
        performed_at,
        notes
      ),
      audit_workpapers (
        id,
        title,
        description,
        reference_number,
        created_at
      )
      `
    )
    .eq('id', engagementId)
    .single()

  return { data, error }
}
