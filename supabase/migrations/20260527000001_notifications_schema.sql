-- Phase 11: Notifications table
-- Migration: 20260527000001_notifications_schema.sql

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  body            text,
  link            text,
  source_module   text,            -- 'risk' | 'compliance' | 'kri' | 'audit' | 'incident' | 'board'
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_user_idx         on public.notifications(user_id);
create index if not exists notifications_institution_idx  on public.notifications(institution_id);
create index if not exists notifications_read_at_idx      on public.notifications(read_at) where read_at is null;

alter table public.notifications enable row level security;
