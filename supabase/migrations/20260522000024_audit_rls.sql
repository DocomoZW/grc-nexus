-- Migration: 20260522000024_audit_rls.sql
-- Phase 6 Internal Audit: RLS policies for audit finding/evidence tables and storage.

alter table public.audit_findings enable row level security;
alter table public.audit_findings force row level security;

create policy "audit_findings_select" on public.audit_findings
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "audit_findings_insert" on public.audit_findings
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );

create policy "audit_findings_update" on public.audit_findings
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (
      (select public.active_role()) in ('admin', 'audit-officer')
      or remediation_owner_id = auth.uid()
    )
  );

alter table public.audit_finding_evidence enable row level security;
alter table public.audit_finding_evidence force row level security;

create policy "audit_finding_evidence_select" on public.audit_finding_evidence
  for select to authenticated
  using (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in (
      'admin', 'ceo', 'audit-officer', 'risk-officer', 'compliance-officer', 'board-member', 'dept-head'
    )
  );

create policy "audit_finding_evidence_insert" on public.audit_finding_evidence
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (
      (select public.active_role()) in ('admin', 'audit-officer')
      or exists (
        select 1
        from public.audit_findings af
        where af.id = finding_id
          and af.institution_id = (select public.institution_id())
          and af.remediation_owner_id = auth.uid()
      )
    )
  );

create policy "audit_evidence_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'audit-evidence'
    and (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'institution_id')
  );

create policy "audit_evidence_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'audit-evidence'
    and (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'institution_id')
    and (
      (select public.active_role()) in ('admin', 'audit-officer')
      or exists (
        select 1
        from public.audit_findings af
        where af.id::text = (storage.foldername(name))[2]
          and af.institution_id::text = (storage.foldername(name))[1]
          and af.remediation_owner_id = auth.uid()
      )
    )
  );
