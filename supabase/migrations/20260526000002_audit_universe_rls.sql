-- Migration: 20260526000002_audit_universe_rls.sql
-- Phase 10 Audit Universe RLS.
-- Helper convention: (select public.institution_id()) and (select public.active_role()).

-- ============================================================
-- audit_plans
-- ============================================================

alter table public.audit_plans enable row level security;
alter table public.audit_plans force row level security;

create policy "audit_plans_select" on public.audit_plans
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "audit_plans_insert" on public.audit_plans
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );

create policy "audit_plans_update" on public.audit_plans
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );

-- ============================================================
-- audit_engagements
-- ============================================================

alter table public.audit_engagements enable row level security;
alter table public.audit_engagements force row level security;

create policy "audit_engagements_select" on public.audit_engagements
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "audit_engagements_insert" on public.audit_engagements
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );

create policy "audit_engagements_update" on public.audit_engagements
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (
      (select public.active_role()) in ('admin', 'audit-officer')
      or lead_auditor_id = auth.uid()
    )
  );

-- ============================================================
-- audit_test_procedures
-- ============================================================

alter table public.audit_test_procedures enable row level security;
alter table public.audit_test_procedures force row level security;

create policy "audit_test_procedures_select" on public.audit_test_procedures
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "audit_test_procedures_insert" on public.audit_test_procedures
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );

create policy "audit_test_procedures_update" on public.audit_test_procedures
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (
      (select public.active_role()) in ('admin', 'audit-officer')
      or performed_by = auth.uid()
    )
  );

-- ============================================================
-- audit_workpapers
-- ============================================================

alter table public.audit_workpapers enable row level security;
alter table public.audit_workpapers force row level security;

create policy "audit_workpapers_select" on public.audit_workpapers
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "audit_workpapers_insert" on public.audit_workpapers
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );

create policy "audit_workpapers_update" on public.audit_workpapers
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );
