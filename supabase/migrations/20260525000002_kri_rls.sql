-- Migration: 20260525000002_kri_rls.sql
-- Phase 9 KRI RLS policies.
-- Helper convention: always use (select public.institution_id()) and (select public.active_role()).

alter table public.kri_definitions enable row level security;
alter table public.kri_definitions force row level security;

create policy "kri_definitions_select" on public.kri_definitions
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "kri_definitions_insert" on public.kri_definitions
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'risk-officer')
  );

create policy "kri_definitions_update" on public.kri_definitions
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'risk-officer')
  );

-- kri_readings: no UPDATE policy — append-only immutable readings

alter table public.kri_readings enable row level security;
alter table public.kri_readings force row level security;

create policy "kri_readings_select" on public.kri_readings
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "kri_readings_insert" on public.kri_readings
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'risk-officer')
  );
