-- Migration: 20260605000002_pecg_compliance_rls.sql
-- PECG Act Compliance Engine: Row Level Security policies
-- Mirrors the existing compliance_rls pattern (20260522000021_compliance_rls.sql)

-- ============================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================================

alter table public.pecg_compliance_rules enable row level security;
alter table public.pecg_compliance_checks enable row level security;
alter table public.pecg_compliance_check_evidence enable row level security;
alter table public.pecg_asset_declarations enable row level security;
alter table public.pecg_strategic_plans enable row level security;
alter table public.pecg_disclosures enable row level security;
alter table public.pecg_performance_contracts enable row level security;
alter table public.pecg_institution_compliance_scores enable row level security;

-- ============================================================
-- HELPER: shared_user_institution_ids()
-- Returns all institution IDs where the user has a role.
-- Reuses the same pattern as existing RLS policies.
-- ============================================================

create or replace function public.shared_user_institution_ids()
returns setof uuid
language sql
stable
security definer
as $$
  select institution_id
  from public.user_roles
  where user_id = auth.uid()
    and role_name in ('admin', 'board-member', 'ceo', 'risk-officer', 'audit-officer', 'compliance-officer', 'dept-head')
  union
  select institution_id
  from public.user_profiles
  where id = auth.uid()
    and institution_id is not null
$$;

-- ============================================================
-- POLICIES: pecg_compliance_rules
-- Rules are read-only for all authenticated users (master data)
-- Only admins can insert/update
-- ============================================================

create policy "pecg_rules_select_all"
  on public.pecg_compliance_rules
  for select
  to authenticated
  using (true);

create policy "pecg_rules_insert_admin"
  on public.pecg_compliance_rules
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

create policy "pecg_rules_update_admin"
  on public.pecg_compliance_rules
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

-- ============================================================
-- POLICIES: pecg_compliance_checks
-- Users can only see checks for their institutions
-- ============================================================

create policy "pecg_checks_select_own_institution"
  on public.pecg_compliance_checks
  for select
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_checks_insert_own_institution"
  on public.pecg_compliance_checks
  for insert
  to authenticated
  with check (institution_id in (select shared_user_institution_ids()));

create policy "pecg_checks_update_own_institution"
  on public.pecg_compliance_checks
  for update
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_checks_delete_admin"
  on public.pecg_compliance_checks
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

-- ============================================================
-- POLICIES: pecg_compliance_check_evidence
-- Users can only see evidence for their institutions
-- ============================================================

create policy "pecg_evidence_select_own_institution"
  on public.pecg_compliance_check_evidence
  for select
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_evidence_insert_own_institution"
  on public.pecg_compliance_check_evidence
  for insert
  to authenticated
  with check (institution_id in (select shared_user_institution_ids()));

create policy "pecg_evidence_delete_admin"
  on public.pecg_compliance_check_evidence
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

-- ============================================================
-- POLICIES: pecg_asset_declarations
-- ============================================================

create policy "pecg_assets_select_own_institution"
  on public.pecg_asset_declarations
  for select
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_assets_insert_own_institution"
  on public.pecg_asset_declarations
  for insert
  to authenticated
  with check (institution_id in (select shared_user_institution_ids()));

create policy "pecg_assets_update_own_institution"
  on public.pecg_asset_declarations
  for update
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_assets_delete_admin"
  on public.pecg_asset_declarations
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

-- ============================================================
-- POLICIES: pecg_strategic_plans
-- ============================================================

create policy "pecg_plans_select_own_institution"
  on public.pecg_strategic_plans
  for select
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_plans_insert_own_institution"
  on public.pecg_strategic_plans
  for insert
  to authenticated
  with check (institution_id in (select shared_user_institution_ids()));

create policy "pecg_plans_update_own_institution"
  on public.pecg_strategic_plans
  for update
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_plans_delete_admin"
  on public.pecg_strategic_plans
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

-- ============================================================
-- POLICIES: pecg_disclosures
-- ============================================================

create policy "pecg_disclosures_select_own_institution"
  on public.pecg_disclosures
  for select
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_disclosures_insert_own_institution"
  on public.pecg_disclosures
  for insert
  to authenticated
  with check (institution_id in (select shared_user_institution_ids()));

create policy "pecg_disclosures_update_own_institution"
  on public.pecg_disclosures
  for update
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_disclosures_delete_admin"
  on public.pecg_disclosures
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

-- ============================================================
-- POLICIES: pecg_performance_contracts
-- ============================================================

create policy "pecg_contracts_select_own_institution"
  on public.pecg_performance_contracts
  for select
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_contracts_insert_own_institution"
  on public.pecg_performance_contracts
  for insert
  to authenticated
  with check (institution_id in (select shared_user_institution_ids()));

create policy "pecg_contracts_update_own_institution"
  on public.pecg_performance_contracts
  for update
  to authenticated
  using (institution_id in (select shared_user_institution_ids()));

create policy "pecg_contracts_delete_admin"
  on public.pecg_performance_contracts
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

-- ============================================================
-- POLICIES: pecg_institution_compliance_scores
-- All authenticated users can see scores (oversight transparency)
-- Only system/admin can insert/update
-- ============================================================

create policy "pecg_scores_select_all"
  on public.pecg_institution_compliance_scores
  for select
  to authenticated
  using (true);

create policy "pecg_scores_insert_system"
  on public.pecg_institution_compliance_scores
  for insert
  to authenticated
  with check (
    calculated_by is null -- system-generated
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

create policy "pecg_scores_update_admin"
  on public.pecg_institution_compliance_scores
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role_name = 'admin'
    )
  );

-- ============================================================
-- STORAGE RLS: pecg-evidence bucket
-- ============================================================

create policy "pecg_storage_select_own_institution"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pecg-evidence'
    and (storage.foldername(name))[1] in (select shared_user_institution_ids()::text)
  );

create policy "pecg_storage_insert_own_institution"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pecg-evidence'
    and (storage.foldername(name))[1] in (select shared_user_institution_ids()::text)
  );

create policy "pecg_storage_delete_own_institution"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pecg-evidence'
    and (storage.foldername(name))[1] in (select shared_user_institution_ids()::text)
  );
