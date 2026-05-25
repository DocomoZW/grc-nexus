-- Phase 12: ESG Schema
-- Migration: 20260528000001_esg_schema.sql

-- ESG frameworks reference table (seeded below)
create table if not exists public.esg_frameworks (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,              -- 'GRI' | 'SASB' | 'TCFD'
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ESG metric definitions (institution-specific)
create table if not exists public.esg_metrics (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  framework_id      uuid references public.esg_frameworks(id),
  metric_code       text not null,
  name              text not null,
  category          text not null check (category in ('Environmental','Social','Governance')),
  unit              text not null,               -- e.g. 'tCO2e', '%', 'count'
  target_value      numeric,
  description       text,
  created_by        uuid not null references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ESG metric readings (immutable historical records)
create table if not exists public.esg_readings (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  metric_id      uuid not null references public.esg_metrics(id) on delete cascade,
  period_label   text not null,                  -- e.g. 'Q1 2026', 'FY2025'
  actual_value   numeric not null,
  notes          text,
  evidence_url   text,
  recorded_by    uuid not null references auth.users(id),
  created_at     timestamptz not null default now()
);

create index if not exists esg_metrics_institution_idx  on public.esg_metrics(institution_id);
create index if not exists esg_readings_metric_idx      on public.esg_readings(metric_id);
create index if not exists esg_readings_institution_idx on public.esg_readings(institution_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.esg_frameworks enable row level security;
alter table public.esg_metrics    enable row level security;
alter table public.esg_readings   enable row level security;

-- Frameworks: public read, no direct writes (seeded here)
create policy "anyone_read_esg_frameworks"
  on public.esg_frameworks for select using (true);

-- Metrics: institution-scoped
create policy "institution_select_esg_metrics"
  on public.esg_metrics for select
  using (institution_id = (select public.institution_id()));

create policy "esg_officer_insert_metrics"
  on public.esg_metrics for insert
  with check (institution_id = (select public.institution_id()));

create policy "esg_officer_update_metrics"
  on public.esg_metrics for update
  using (institution_id = (select public.institution_id()))
  with check (institution_id = (select public.institution_id()));

-- Readings: institution-scoped
create policy "institution_select_esg_readings"
  on public.esg_readings for select
  using (institution_id = (select public.institution_id()));

create policy "esg_officer_insert_readings"
  on public.esg_readings for insert
  with check (institution_id = (select public.institution_id()));

-- ── Seed ESG frameworks ───────────────────────────────────────────────────────

insert into public.esg_frameworks (code, name, description) values
  ('GRI',  'GRI Standards',               'Global Reporting Initiative — universal sustainability reporting standards'),
  ('SASB', 'SASB Standards',              'Sustainability Accounting Standards Board — industry-specific standards'),
  ('TCFD', 'TCFD Recommendations',        'Task Force on Climate-related Financial Disclosures')
on conflict (code) do nothing;

-- ── Audit triggers ────────────────────────────────────────────────────────────

select audit.attach_audit_trigger('esg_metrics');
select audit.attach_audit_trigger('esg_readings');
