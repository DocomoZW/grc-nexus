-- Migration: 20260522000023_audit_schema.sql
-- Phase 6 Internal Audit: enums, finding/evidence tables, indexes, and storage bucket.

create type public.audit_finding_severity as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type public.audit_finding_status as enum (
  'open',
  'in_progress',
  'closed'
);

create type public.audit_linked_entity_type as enum (
  'risk',
  'control',
  'compliance_obligation'
);

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  finding_reference text not null default ('AUD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  title text not null,
  description text,
  severity public.audit_finding_severity not null,
  status public.audit_finding_status not null default 'open',
  root_cause text not null,
  linked_entity_type public.audit_linked_entity_type not null,
  linked_entity_id uuid not null,
  remediation_owner_id uuid references auth.users(id) on delete set null,
  review_date date not null,
  due_date date not null,
  created_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, finding_reference)
);

create index idx_audit_findings_institution_id on public.audit_findings (institution_id);
create index idx_audit_findings_status on public.audit_findings (status);
create index idx_audit_findings_severity on public.audit_findings (severity);
create index idx_audit_findings_due_date on public.audit_findings (due_date);
create index idx_audit_findings_owner_id on public.audit_findings (remediation_owner_id);
create index idx_audit_findings_review_date on public.audit_findings (review_date);

create table public.audit_finding_evidence (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  finding_id uuid not null references public.audit_findings(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  sha256_hash text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index idx_audit_finding_evidence_institution_id on public.audit_finding_evidence (institution_id);
create index idx_audit_finding_evidence_finding_id on public.audit_finding_evidence (finding_id);

insert into storage.buckets (id, name, public)
values ('audit-evidence', 'audit-evidence', false);
