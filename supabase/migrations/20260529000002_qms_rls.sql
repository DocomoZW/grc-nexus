-- Phase 13: QMS RLS + Audit Triggers
-- Migration: 20260529000002_qms_rls.sql

-- ── Enable RLS ────────────────────────────────────────────────────────────────

alter table public.qms_documents       enable row level security;
alter table public.non_conformances    enable row level security;
alter table public.management_reviews  enable row level security;
alter table public.review_action_items enable row level security;

-- ── qms_documents policies ────────────────────────────────────────────────────

create policy "institution_select_qms_documents"
  on public.qms_documents for select
  using (institution_id = (select public.institution_id()));

create policy "qms_writer_insert_qms_documents"
  on public.qms_documents for insert
  with check (institution_id = (select public.institution_id()));

create policy "qms_writer_update_qms_documents"
  on public.qms_documents for update
  using (institution_id = (select public.institution_id()))
  with check (institution_id = (select public.institution_id()));

-- ── non_conformances policies ─────────────────────────────────────────────────

create policy "institution_select_non_conformances"
  on public.non_conformances for select
  using (institution_id = (select public.institution_id()));

create policy "qms_writer_insert_non_conformances"
  on public.non_conformances for insert
  with check (institution_id = (select public.institution_id()));

create policy "qms_writer_update_non_conformances"
  on public.non_conformances for update
  using (institution_id = (select public.institution_id()))
  with check (institution_id = (select public.institution_id()));

-- ── management_reviews policies ───────────────────────────────────────────────

create policy "institution_select_management_reviews"
  on public.management_reviews for select
  using (institution_id = (select public.institution_id()));

create policy "qms_writer_insert_management_reviews"
  on public.management_reviews for insert
  with check (institution_id = (select public.institution_id()));

create policy "qms_writer_update_management_reviews"
  on public.management_reviews for update
  using (institution_id = (select public.institution_id()))
  with check (institution_id = (select public.institution_id()));

-- ── review_action_items policies ─────────────────────────────────────────────

create policy "institution_select_review_action_items"
  on public.review_action_items for select
  using (institution_id = (select public.institution_id()));

create policy "qms_writer_insert_review_action_items"
  on public.review_action_items for insert
  with check (institution_id = (select public.institution_id()));

create policy "qms_writer_update_review_action_items"
  on public.review_action_items for update
  using (institution_id = (select public.institution_id()))
  with check (institution_id = (select public.institution_id()));

-- ── Audit triggers ────────────────────────────────────────────────────────────

select audit.attach_audit_trigger('qms_documents');
select audit.attach_audit_trigger('non_conformances');
select audit.attach_audit_trigger('management_reviews');
select audit.attach_audit_trigger('review_action_items');
