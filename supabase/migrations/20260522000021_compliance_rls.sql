-- Migration: 20260522000021_compliance_rls.sql
-- Phase 4 Compliance Management: RLS policies for all three compliance tables + Storage bucket.
-- Helper convention: always use (select public.institution_id()) and (select public.active_role()).
-- Role string: 'compliance-officer' (hyphen) — matches app_role enum convention in base_schema.sql.
-- JWT claim path: auth.jwt() -> 'app_metadata' ->> 'institution_id' — confirmed from custom_access_token_hook.sql.

-- ============================================================
-- compliance_obligations
-- SELECT: all view roles (D-32 — admin, ceo, compliance-officer, risk-officer, audit-officer, board-member)
-- INSERT/UPDATE: admin + compliance-officer only (D-32)
-- ============================================================

alter table public.compliance_obligations enable row level security;
alter table public.compliance_obligations force row level security;

create policy "compliance_obligations_select" on public.compliance_obligations
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "compliance_obligations_insert" on public.compliance_obligations
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'compliance-officer')
  );

create policy "compliance_obligations_update" on public.compliance_obligations
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'compliance-officer')
  );

-- ============================================================
-- obligation_evidence
-- SELECT: admin, ceo, compliance-officer, risk-officer, audit-officer, board-member (D-32)
-- INSERT: admin + compliance-officer only (D-32)
-- NO UPDATE, NO DELETE — evidence is immutable once uploaded (D-11, TRAIL-04)
-- ============================================================

alter table public.obligation_evidence enable row level security;
alter table public.obligation_evidence force row level security;

create policy "obligation_evidence_select" on public.obligation_evidence
  for select to authenticated
  using (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in (
      'admin', 'ceo', 'compliance-officer', 'risk-officer', 'audit-officer', 'board-member'
    )
  );

create policy "obligation_evidence_insert" on public.obligation_evidence
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'compliance-officer')
  );

-- No UPDATE policy — evidence records are immutable once uploaded
-- No DELETE policy — evidence deletion not permitted (regulatory requirement)

-- ============================================================
-- obligation_attestations
-- SELECT: all view roles (D-32)
-- INSERT: admin, ceo, compliance-officer only (D-20/D-32)
-- NO UPDATE, NO DELETE — append-only audit trail (D-19, T-4-01-T)
-- ============================================================

alter table public.obligation_attestations enable row level security;
alter table public.obligation_attestations force row level security;

create policy "obligation_attestations_select" on public.obligation_attestations
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "obligation_attestations_insert" on public.obligation_attestations
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'compliance-officer')
  );

-- No UPDATE policy — intentional for append-only attestation history (D-19)
-- No DELETE policy — attestation records are permanent (T-4-01-T, regulatory requirement)

-- ============================================================
-- SUPABASE STORAGE RLS: compliance-evidence bucket
-- SELECT: authenticated user can read files in their institution's path prefix
-- INSERT: admin + compliance-officer can upload files to their institution's path prefix
-- JWT claim path: auth.jwt() -> 'app_metadata' ->> 'institution_id' (confirmed from migration 0005)
-- Storage path format: {institution_id}/{obligation_id}/{epoch}_{hash16}.{ext} (D-10)
-- ============================================================

create policy "compliance_evidence_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'compliance-evidence'
    and (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'institution_id')
  );

create policy "compliance_evidence_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'compliance-evidence'
    and (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'institution_id')
    and (select public.active_role()) in ('admin', 'compliance-officer')
  );
