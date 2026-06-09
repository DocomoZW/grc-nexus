-- Migration: 20260605000001_pecg_compliance_schema.sql
-- PECG Act & ZimCode Compliance Engine: Master tables for rule definitions, compliance checks,
-- asset declarations, strategic plans, disclosures, performance contracts, and compliance scores.
-- SECURITY: RLS enabled in subsequent migration (20260605000002_pecg_compliance_rls.sql)

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type public.pecg_check_status as enum (
  'compliant',
  'non_compliant',
  'at_risk',
  'waived',
  'not_applicable'
);

create type public.pecg_rule_severity as enum (
  'info',
  'warning',
  'critical',
  'legal'
);

create type public.pecg_risk_level as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type public.pecg_disclosure_type as enum (
  'pecuniary_interest',
  'conflict_of_interest',
  'related_party_transaction',
  'beneficial_ownership'
);

create type public.pecg_contract_status as enum (
  'pending',
  'signed',
  'in_progress',
  'completed',
  'expired',
  'breached'
);

create type public.pecg_declaration_status as enum (
  'pending',
  'verified',
  'flagged',
  'rejected'
);

create type public.pecg_plan_status as enum (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'expired'
);

-- ============================================================
-- TABLE 1: pecg_compliance_rules
-- Master definitions of all PECG Act and ZimCode compliance rules
-- ============================================================

create table public.pecg_compliance_rules (
  id              uuid primary key default gen_random_uuid(),
  rule_code       text not null unique,
  rule_name       text not null,
  regulation      text not null,              -- 'PECG_ACT' or 'ZIMCODE'
  section_ref     text,                       -- e.g., 'Section 11', 'Principle 5'
  description     text not null,
  check_type      text not null,              -- 'deadline', 'threshold', 'presence', 'absence', 'count', 'ratio'
  check_config    jsonb not null default '{}',
  severity        public.pecg_rule_severity not null default 'warning',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_pecg_rules_regulation on public.pecg_compliance_rules (regulation);
create index idx_pecg_rules_severity on public.pecg_compliance_rules (severity);
create index idx_pecg_rules_active on public.pecg_compliance_rules (is_active);

-- ============================================================
-- TABLE 2: pecg_compliance_checks
-- Individual check executions per institution per rule
-- ============================================================

create table public.pecg_compliance_checks (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  rule_id         uuid not null references public.pecg_compliance_rules(id) on delete cascade,
  status          public.pecg_check_status not null,
  target_id       uuid,                       -- Related record (flexible FK)
  target_type     text,                       -- 'board_member', 'meeting', 'obligation', 'declaration', 'disclosure', 'contract', 'plan'
  check_data      jsonb default '{}',        -- Snapshot of data used for check
  result_details  jsonb default '{}',        -- Detailed findings
  due_date        date,                       -- When compliance is expected
  checked_at      timestamptz not null default now(),
  checked_by      uuid references auth.users(id) on delete set null, -- null = system
  evidence_count  integer not null default 0,
  notes           text,
  unique (institution_id, rule_id, target_id, target_type)
);

create index idx_pecg_checks_institution_id on public.pecg_compliance_checks (institution_id);
create index idx_pecg_checks_rule_id on public.pecg_compliance_checks (rule_id);
create index idx_pecg_checks_status on public.pecg_compliance_checks (status);
create index idx_pecg_checks_target on public.pecg_compliance_checks (target_id, target_type);
create index idx_pecg_checks_checked_at on public.pecg_compliance_checks (checked_at desc);

-- ============================================================
-- TABLE 3: pecg_compliance_check_evidence
-- Evidence for compliance checks (append-only)
-- ============================================================

create table public.pecg_compliance_check_evidence (
  id                  uuid primary key default gen_random_uuid(),
  check_id            uuid not null references public.pecg_compliance_checks(id) on delete cascade,
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  storage_path        text not null,
  original_filename   text not null,
  mime_type           text not null,
  file_size_bytes     bigint not null,
  sha256_hash         text not null,
  uploaded_by         uuid references auth.users(id) on delete set null,
  uploaded_at         timestamptz not null default now()
);

create index idx_pecg_evidence_check_id on public.pecg_compliance_check_evidence (check_id);
create index idx_pecg_evidence_institution_id on public.pecg_compliance_check_evidence (institution_id);

-- ============================================================
-- TABLE 4: pecg_asset_declarations
-- Board member asset declarations (PECG Act Section 37)
-- ============================================================

create table public.pecg_asset_declarations (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  board_member_id     uuid not null references auth.users(id) on delete cascade,
  declaration_year    integer not null,
  declaration_date    date not null,
  immovable_properties jsonb default '[]',
  business_interests  jsonb default '[]',
  high_value_items    jsonb default '[]',   -- Items > $100,000
  total_value_estimate numeric,
  declaration_file_path text,
  verified_by         uuid references auth.users(id) on delete set null,
  verified_at         timestamptz,
  status              public.pecg_declaration_status not null default 'pending',
  created_at          timestamptz not null default now()
);

create index idx_pecg_assets_institution_id on public.pecg_asset_declarations (institution_id);
create index idx_pecg_assets_board_member on public.pecg_asset_declarations (board_member_id);
create index idx_pecg_assets_year on public.pecg_asset_declarations (declaration_year);

-- ============================================================
-- TABLE 5: pecg_strategic_plans
-- Strategic plans for institutions (PECG Act Section 22)
-- ============================================================

create table public.pecg_strategic_plans (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  plan_period_start   integer not null,          -- e.g., 2026
  plan_period_end     integer not null,          -- e.g., 2030
  title               text not null,
  objectives          jsonb not null default '[]',
  priorities          jsonb not null default '[]',
  performance_indicators jsonb not null default '[]',
  plan_document_path  text,
  submitted_to_minister boolean not null default false,
  submitted_to_cgu    boolean not null default false,
  submitted_to_finance boolean not null default false,
  submitted_at        date,
  approved_by_minister boolean,
  approved_at         date,
  status              public.pecg_plan_status not null default 'draft',
  created_at          timestamptz not null default now()
);

create index idx_pecg_plans_institution_id on public.pecg_strategic_plans (institution_id);
create index idx_pecg_plans_period on public.pecg_strategic_plans (plan_period_start, plan_period_end);

-- ============================================================
-- TABLE 6: pecg_disclosures
-- Conflict of interest and other disclosures (PECG Act Section 34)
-- ============================================================

create table public.pecg_disclosures (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  discloser_id        uuid not null references auth.users(id) on delete cascade,
  disclosure_type     public.pecg_disclosure_type not null,
  description         text not null,
  related_party_name  text,
  relationship_type   text,
  value_estimate      numeric,
  disclosed_at        timestamptz not null default now(),
  meeting_id          uuid references public.board_meetings(id) on delete set null,
  recused_from_discussion boolean not null default false,
  recused_from_voting   boolean not null default false,
  status              text not null default 'active', -- 'active', 'resolved', 'flagged', 'escalated'
  reviewed_by         uuid references auth.users(id) on delete set null,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now()
);

create index idx_pecg_disclosures_institution_id on public.pecg_disclosures (institution_id);
create index idx_pecg_disclosures_discloser on public.pecg_disclosures (discloser_id);
create index idx_pecg_disclosures_type on public.pecg_disclosures (disclosure_type);

-- ============================================================
-- TABLE 7: pecg_performance_contracts
-- Performance contracts for board members and CEOs (PECG Act Sections 23, 25)
-- ============================================================

create table public.pecg_performance_contracts (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  contract_type       text not null,              -- 'board_member' or 'ceo'
  employee_id         uuid not null references auth.users(id) on delete cascade,
  appointed_at        date not null,
  contract_due_at     date not null,              -- When contract should be signed
  contract_signed_at  date,                       -- When actually signed
  contract_document_path text,
  performance_targets jsonb not null default '[]',
  review_period       text not null default 'quarterly', -- 'quarterly', 'annual'
  last_reviewed_at    date,
  next_review_due_at  date,
  status              public.pecg_contract_status not null default 'pending',
  created_at          timestamptz not null default now()
);

create index idx_pecg_contracts_institution_id on public.pecg_performance_contracts (institution_id);
create index idx_pecg_contracts_employee on public.pecg_performance_contracts (employee_id);
create index idx_pecg_contracts_status on public.pecg_performance_contracts (status);

-- ============================================================
-- TABLE 8: pecg_institution_compliance_scores
-- Aggregated compliance scores per institution per day
-- ============================================================

create table public.pecg_institution_compliance_scores (
  id                      uuid primary key default gen_random_uuid(),
  institution_id          uuid not null references public.institutions(id) on delete restrict,
  score_date              date not null,
  overall_score           numeric(5,2) not null default 0,
  pecg_act_score          numeric(5,2) not null default 0,
  zimcode_score           numeric(5,2) not null default 0,
  board_composition_score numeric(5,2) default 0,
  performance_management_score numeric(5,2) default 0,
  governance_score        numeric(5,2) default 0,
  meeting_score           numeric(5,2) default 0,
  disclosure_score        numeric(5,2) default 0,
  risk_level              public.pecg_risk_level not null default 'low',
  check_count             integer not null default 0,
  compliant_count         integer not null default 0,
  non_compliant_count     integer not null default 0,
  at_risk_count           integer not null default 0,
  score_details           jsonb default '{}',
  calculated_at           timestamptz not null default now(),
  calculated_by           uuid references auth.users(id) on delete set null,
  unique (institution_id, score_date)
);

create index idx_pecg_scores_institution_id on public.pecg_institution_compliance_scores (institution_id);
create index idx_pecg_scores_date on public.pecg_institution_compliance_scores (score_date desc);

-- ============================================================
-- SUPABASE STORAGE BUCKET
-- ============================================================
insert into storage.buckets (id, name, public)
values ('pecg-evidence', 'pecg-evidence', false);
