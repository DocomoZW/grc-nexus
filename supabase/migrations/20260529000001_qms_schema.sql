-- Phase 13: ISO 9001 QMS Schema
-- Migration: 20260529000001_qms_schema.sql

-- ── Controlled Documents ─────────────────────────────────────────────────────

create table if not exists public.qms_documents (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  doc_code        text not null,
  title           text not null,
  doc_type        text not null check (doc_type in ('procedure','policy','work_instruction','form','record','manual')),
  version         integer not null default 1,
  status          text not null default 'draft' check (status in ('draft','under_review','approved','obsolete')),
  owner_id        uuid references auth.users(id),
  review_due_at   date,
  approved_at     timestamptz,
  file_url        text,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-increment version on update trigger
create or replace function public.qms_document_version_bump()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'approved' and OLD.status != 'approved' then
    NEW.version := OLD.version + 1;
    NEW.approved_at := now();
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger qms_document_before_update
  before update on public.qms_documents
  for each row execute function public.qms_document_version_bump();

-- ── Non-Conformances ─────────────────────────────────────────────────────────

create table if not exists public.non_conformances (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  nc_number       text not null,
  title           text not null,
  description     text not null,
  source          text not null check (source in ('internal_audit','external_audit','customer_complaint','process_observation','supplier','other')),
  severity        text not null check (severity in ('minor','major','critical')),
  status          text not null default 'open' check (status in ('open','root_cause_analysis','corrective_action','verification','closed')),
  assigned_to     uuid references auth.users(id),
  due_date        date,
  root_cause      text,
  corrective_action text,
  verified_by     uuid references auth.users(id),
  verified_at     timestamptz,
  closed_at       timestamptz,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Management Reviews ────────────────────────────────────────────────────────

create table if not exists public.management_reviews (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  title           text not null,
  review_date     date not null,
  attendees       text[],
  qms_performance_summary text,
  customer_feedback_summary text,
  process_performance_summary text,
  audit_results_summary text,
  improvement_opportunities text,
  resource_needs  text,
  status          text not null default 'planned' check (status in ('planned','in_progress','completed')),
  minutes_url     text,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Review Action Items ────────────────────────────────────────────────────────

create table if not exists public.review_action_items (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  review_id       uuid not null references public.management_reviews(id) on delete cascade,
  description     text not null,
  owner_id        uuid references auth.users(id),
  due_date        date,
  status          text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  completed_at    timestamptz,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists qms_docs_institution_idx   on public.qms_documents(institution_id);
create index if not exists qms_docs_review_due_idx    on public.qms_documents(review_due_at) where review_due_at is not null;
create index if not exists qms_nc_institution_idx     on public.non_conformances(institution_id);
create index if not exists qms_nc_status_idx          on public.non_conformances(status);
create index if not exists qms_reviews_institution_idx on public.management_reviews(institution_id);
create index if not exists qms_actions_review_idx     on public.review_action_items(review_id);
