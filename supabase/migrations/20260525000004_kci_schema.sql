-- Migration: 20260525000004_kci_schema.sql
-- Phase 9 KCI: kci_definitions + kci_readings tables + indexes.
-- Enums (indicator_status, indicator_direction) declared in 20260525000001_kri_schema.sql.
-- SECURITY: RLS is enabled in subsequent migration (20260525000005_kci_rls.sql).

-- ============================================================
-- kci_definitions
-- ============================================================

create table public.kci_definitions (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  treatment_id        uuid references public.risk_treatments(id) on delete set null,
  title               text not null,
  description         text,
  unit_of_measure     text not null,
  target_value        numeric not null,
  alert_threshold     numeric not null,
  direction           public.indicator_direction not null default 'lower_is_worse',
  owner_id            uuid references auth.users(id) on delete set null,
  reporting_frequency public.kpi_frequency not null default 'quarterly',
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_kci_definitions_institution_id on public.kci_definitions (institution_id);
create index idx_kci_definitions_treatment_id    on public.kci_definitions (treatment_id);
create index idx_kci_definitions_owner_id         on public.kci_definitions (owner_id);

-- ============================================================
-- kci_readings (append-only — no UPDATE RLS policy)
-- ============================================================

create table public.kci_readings (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  kci_id         uuid not null references public.kci_definitions(id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  actual_value   numeric not null,
  status         public.indicator_status not null default 'no_data',
  notes          text,
  recorded_by    uuid references auth.users(id) on delete set null,
  recorded_at    timestamptz not null default now(),
  check (period_end >= period_start)
);

create index idx_kci_readings_institution_id on public.kci_readings (institution_id);
create index idx_kci_readings_kci_id         on public.kci_readings (kci_id);
create index idx_kci_readings_recorded_at     on public.kci_readings (recorded_at);
create index idx_kci_readings_period_start    on public.kci_readings (period_start);
