-- Migration: 20260522000002_rls_policies.sql
-- Row-Level Security policies for all Phase 1 tables.
-- SECURITY: All functions use SECURITY DEFINER with set search_path = '' (prevents search_path injection).
-- SECURITY: All policies use (SELECT auth.helper()) wrapper to cache per-statement (not per-row).
-- SECURITY: All policies scoped TO authenticated to avoid evaluating for anon role.

-- ============================================================
-- HELPER FUNCTIONS — cached JWT claim readers
-- ============================================================

-- Reads institution_id from JWT app_metadata (set by custom_access_token_hook)
-- Using SELECT wrapper caches per-statement — critical for RLS performance on large tables
create or replace function auth.institution_id() returns uuid as $$
  select (auth.jwt()->'app_metadata'->>'institution_id')::uuid
$$ language sql stable security definer set search_path = '';

-- Reads active_role from JWT app_metadata
create or replace function auth.active_role() returns text as $$
  select auth.jwt()->'app_metadata'->>'active_role'
$$ language sql stable security definer set search_path = '';

-- ============================================================
-- INSTITUTIONS
-- ============================================================

alter table public.institutions enable row level security;
alter table public.institutions force row level security;

-- Users can view institutions in their own institution (admins need to see all in same institution)
create policy "institution_select" on public.institutions
  for select to authenticated
  using (id = (select auth.institution_id()));

-- Only admins can insert/update institutions
create policy "institution_insert" on public.institutions
  for insert to authenticated
  with check (
    id = (select auth.institution_id())
    and (select auth.active_role()) = 'admin'
  );

create policy "institution_update" on public.institutions
  for update to authenticated
  using (id = (select auth.institution_id()))
  with check (
    id = (select auth.institution_id())
    and (select auth.active_role()) = 'admin'
  );

-- ============================================================
-- USER PROFILES
-- ============================================================

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;

-- Users can see their own profile OR all profiles in their institution (needed for admin UI)
create policy "user_profiles_select" on public.user_profiles
  for select to authenticated
  using (
    id = auth.uid()
    or institution_id = (select auth.institution_id())
  );

-- Users can only insert their own profile (created via trigger or server action)
create policy "user_profiles_insert" on public.user_profiles
  for insert to authenticated
  with check (id = auth.uid());

-- Users can update their own profile; admins can update profiles in their institution
create policy "user_profiles_update" on public.user_profiles
  for update to authenticated
  using (
    id = auth.uid()
    or (
      institution_id = (select auth.institution_id())
      and (select auth.active_role()) = 'admin'
    )
  )
  with check (
    id = auth.uid()
    or (
      institution_id = (select auth.institution_id())
      and (select auth.active_role()) = 'admin'
    )
  );

-- ============================================================
-- USER ROLES
-- ============================================================

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

-- Users can see their own roles or all roles in their institution
create policy "user_roles_select" on public.user_roles
  for select to authenticated
  using (
    user_id = auth.uid()
    or institution_id = (select auth.institution_id())
  );

-- Only admins can assign roles (INSERT)
create policy "user_roles_insert" on public.user_roles
  for insert to authenticated
  with check (
    institution_id = (select auth.institution_id())
    and (select auth.active_role()) = 'admin'
  );

-- Only admins can remove roles (DELETE)
create policy "user_roles_delete" on public.user_roles
  for delete to authenticated
  using (
    institution_id = (select auth.institution_id())
    and (select auth.active_role()) = 'admin'
  );

-- ============================================================
-- MFA DEVICE TRUST — private to each user
-- ============================================================

alter table public.mfa_device_trust enable row level security;
alter table public.mfa_device_trust force row level security;

create policy "mfa_device_trust_select" on public.mfa_device_trust
  for select to authenticated
  using (user_id = auth.uid());

create policy "mfa_device_trust_insert" on public.mfa_device_trust
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "mfa_device_trust_delete" on public.mfa_device_trust
  for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- MFA BACKUP CODES — private to each user
-- ============================================================

alter table public.mfa_backup_codes enable row level security;
alter table public.mfa_backup_codes force row level security;

create policy "mfa_backup_codes_select" on public.mfa_backup_codes
  for select to authenticated
  using (user_id = auth.uid());

create policy "mfa_backup_codes_insert" on public.mfa_backup_codes
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "mfa_backup_codes_update" on public.mfa_backup_codes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "mfa_backup_codes_delete" on public.mfa_backup_codes
  for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- MFA OTP CHALLENGES — private to each user
-- ============================================================

alter table public.mfa_otp_challenges enable row level security;
alter table public.mfa_otp_challenges force row level security;

create policy "mfa_otp_challenges_select" on public.mfa_otp_challenges
  for select to authenticated
  using (user_id = auth.uid());

create policy "mfa_otp_challenges_insert" on public.mfa_otp_challenges
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "mfa_otp_challenges_update" on public.mfa_otp_challenges
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "mfa_otp_challenges_delete" on public.mfa_otp_challenges
  for delete to authenticated
  using (user_id = auth.uid());
