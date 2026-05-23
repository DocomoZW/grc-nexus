-- Migration: 20260522000020_compliance_schema.sql
-- Phase 4 Compliance Management: enums, tables, indexes, storage bucket.
-- SECURITY: RLS is enabled in subsequent migration (20260522000021_compliance_rls.sql)

-- ============================================================
-- ENUMS
-- ============================================================

create type public.regulatory_framework as enum (
  'pecoga',
  'ppdpa',
  'nds2',
  'iso_37000',
  'king_iv',
  'ipsas',
  'pfma',
  'other'
);

create type public.obligation_status as enum (
  'pending',
  'compliant',
  'partially_compliant',
  'non_compliant',
  'overdue',
  'waived'
);

create type public.attestation_status as enum (
  'compliant',
  'partially_compliant',
  'non_compliant'
);

-- ============================================================
-- TABLE 1: compliance_obligations
-- ============================================================

create table public.compliance_obligations (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  framework           public.regulatory_framework not null,
  framework_reference text,
  title               text not null,
  description         text,
  owner_id            uuid references auth.users(id) on delete set null,
  due_date            date not null,
  status              public.obligation_status not null default 'pending',
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Indexes per D-07 (institution, framework, owner, status, due_date)
create index idx_compliance_obligations_institution_id on public.compliance_obligations (institution_id);
create index idx_compliance_obligations_framework      on public.compliance_obligations (framework);
create index idx_compliance_obligations_owner_id       on public.compliance_obligations (owner_id);
create index idx_compliance_obligations_status         on public.compliance_obligations (status);
create index idx_compliance_obligations_due_date       on public.compliance_obligations (due_date);

-- ============================================================
-- TABLE 2: obligation_evidence (append-only — no updated_at)
-- ============================================================

create table public.obligation_evidence (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  obligation_id       uuid not null references public.compliance_obligations(id) on delete cascade,
  storage_path        text not null,
  original_filename   text not null,
  mime_type           text not null,
  file_size_bytes     bigint not null,
  sha256_hash         text not null,
  uploaded_by         uuid references auth.users(id) on delete set null,
  uploaded_at         timestamptz not null default now()
);

create index idx_obligation_evidence_institution_id on public.obligation_evidence (institution_id);
create index idx_obligation_evidence_obligation_id  on public.obligation_evidence (obligation_id);

-- ============================================================
-- TABLE 3: obligation_attestations (append-only — no updated_at)
-- D-18: attested_at uses DB default now() — NEVER accepted from client
-- D-19: no UPDATE or DELETE policy — append-only enforced by RLS omission
-- ============================================================

create table public.obligation_attestations (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  obligation_id       uuid not null references public.compliance_obligations(id) on delete cascade,
  attestation_status  public.attestation_status not null,
  attested_by         uuid not null references auth.users(id) on delete restrict,
  attested_at         timestamptz not null default now(),
  notes               text
);

create index idx_obligation_attestations_institution_id on public.obligation_attestations (institution_id);
create index idx_obligation_attestations_obligation_id  on public.obligation_attestations (obligation_id);

-- ============================================================
-- SUPABASE STORAGE BUCKET (private — D-09)
-- Evidence files are served via Route Handler with integrity check (D-29/D-30/D-31).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('compliance-evidence', 'compliance-evidence', false);
