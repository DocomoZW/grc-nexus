-- Migration: 20260526000001_audit_universe_schema.sql
-- Phase 10 Audit Universe: audit_plans, audit_engagements,
-- audit_test_procedures, audit_workpapers tables + indexes.
-- SECURITY: RLS enabled in 20260526000002_audit_universe_rls.sql.

-- ============================================================
-- Enums
-- ============================================================

create type public.audit_plan_status as enum (
  'draft',
  'approved',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.audit_engagement_status as enum (
  'planned',
  'fieldwork',
  'reporting',
  'completed',
  'cancelled'
);

create type public.audit_procedure_result as enum (
  'not_started',
  'pass',
  'fail',
  'exception',
  'not_applicable'
);

-- ============================================================
-- audit_plans  (annual / periodic audit plans)
-- ============================================================

create table public.audit_plans (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete restrict,
  title             text not null,
  description       text,
  plan_year         int  not null,
  status            public.audit_plan_status not null default 'draft',
  approved_by       uuid references auth.users(id) on delete set null,
  approved_at       timestamptz,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_audit_plans_institution_id on public.audit_plans (institution_id);
create index idx_audit_plans_plan_year       on public.audit_plans (plan_year);
create index idx_audit_plans_status          on public.audit_plans (status);

-- ============================================================
-- audit_engagements  (individual audit assignments inside a plan)
-- ============================================================

create table public.audit_engagements (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete restrict,
  plan_id           uuid not null references public.audit_plans(id) on delete cascade,
  title             text not null,
  description       text,
  auditee_dept      text,
  lead_auditor_id   uuid references auth.users(id) on delete set null,
  status            public.audit_engagement_status not null default 'planned',
  planned_start     date not null,
  planned_end       date not null,
  actual_start      date,
  actual_end        date,
  opinion           text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (planned_end >= planned_start)
);

create index idx_audit_engagements_institution_id on public.audit_engagements (institution_id);
create index idx_audit_engagements_plan_id         on public.audit_engagements (plan_id);
create index idx_audit_engagements_status          on public.audit_engagements (status);
create index idx_audit_engagements_lead_auditor_id on public.audit_engagements (lead_auditor_id);

-- ============================================================
-- audit_test_procedures  (test steps inside an engagement)
-- ============================================================

create table public.audit_test_procedures (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete restrict,
  engagement_id     uuid not null references public.audit_engagements(id) on delete cascade,
  step_number       int  not null,
  objective         text not null,
  procedure_text    text not null,
  result            public.audit_procedure_result not null default 'not_started',
  performed_by      uuid references auth.users(id) on delete set null,
  performed_at      timestamptz,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (engagement_id, step_number)
);

create index idx_audit_test_procedures_institution_id on public.audit_test_procedures (institution_id);
create index idx_audit_test_procedures_engagement_id  on public.audit_test_procedures (engagement_id);

-- ============================================================
-- audit_workpapers  (documents / evidence attached to an engagement)
-- ============================================================

create table public.audit_workpapers (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete restrict,
  engagement_id     uuid not null references public.audit_engagements(id) on delete cascade,
  title             text not null,
  description       text,
  reference_number  text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_audit_workpapers_institution_id on public.audit_workpapers (institution_id);
create index idx_audit_workpapers_engagement_id  on public.audit_workpapers (engagement_id);
