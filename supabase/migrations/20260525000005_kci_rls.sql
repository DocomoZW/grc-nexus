-- Migration: 20260525000005_kci_rls.sql
-- Phase 9 KCI RLS policies.
-- Helper convention: always use (select public.institution_id()) and (select public.active_role()).

alter table public.kci_definitions enable row level security;
alter table public.kci_definitions force row level security;

create policy "kci_definitions_select" on public.kci_definitions
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "kci_definitions_insert" on public.kci_definitions
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );

create policy "kci_definitions_update" on public.kci_definitions
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );

-- kci_readings: no UPDATE policy — append-only immutable readings

alter table public.kci_readings enable row level security;
alter table public.kci_readings force row level security;

create policy "kci_readings_select" on public.kci_readings
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "kci_readings_insert" on public.kci_readings
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'audit-officer')
  );
