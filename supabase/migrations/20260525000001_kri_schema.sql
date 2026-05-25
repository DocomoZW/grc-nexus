-- Migration: 20260525000001_kri_schema.sql
-- Phase 9 KRI/KCI: enums + kri_definitions + kri_readings tables + indexes.
-- SECURITY: RLS is enabled in subsequent migration (20260525000002_kri_rls.sql).

-- ============================================================
-- Enums (shared by KRI and KCI)
-- ============================================================

create type public.indicator_status as enum (
  'on_track',
  'at_risk',
  'breached',
  'no_data'
);

create type public.indicator_direction as enum (
  'lower_is_worse',
  'higher_is_worse'
);

-- ============================================================
-- kri_definitions
-- ============================================================

create table public.kri_definitions (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  risk_id             uuid references public.risks(id) on delete set null,
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

create index idx_kri_definitions_institution_id on public.kri_definitions (institution_id);
create index idx_kri_definitions_risk_id         on public.kri_definitions (risk_id);
create index idx_kri_definitions_owner_id         on public.kri_definitions (owner_id);

-- ============================================================
-- kri_readings (append-only — no UPDATE RLS policy)
-- ============================================================

create table public.kri_readings (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  kri_id         uuid not null references public.kri_definitions(id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  actual_value   numeric not null,
  status         public.indicator_status not null default 'no_data',
  notes          text,
  recorded_by    uuid references auth.users(id) on delete set null,
  recorded_at    timestamptz not null default now(),
  check (period_end >= period_start)
);

create index idx_kri_readings_institution_id on public.kri_readings (institution_id);
create index idx_kri_readings_kri_id         on public.kri_readings (kri_id);
create index idx_kri_readings_recorded_at     on public.kri_readings (recorded_at);
create index idx_kri_readings_period_start    on public.kri_readings (period_start);
