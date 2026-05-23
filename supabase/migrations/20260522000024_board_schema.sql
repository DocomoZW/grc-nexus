-- Migration: 20260522000024_board_schema.sql
-- Phase 5 Board Management -- Meetings and Resolutions (D-05 to D-24, D-10, D-17, D-21)
-- Enums + tables + indexes + private Storage bucket.
-- SECURITY: RLS enabled in 00025; audit triggers in 00026.

create type public.meeting_status as enum ('scheduled', 'in_progress', 'closed');
create type public.resolution_outcome as enum ('passed', 'rejected', 'tabled');
create type public.action_item_status as enum ('open', 'in_progress', 'completed', 'overdue', 'cancelled');

create table public.board_meetings (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  title          text not null,
  meeting_date   timestamptz not null,
  location       text,
  status         public.meeting_status not null default 'scheduled',
  agenda_items   text[] not null default '{}',
  attendee_ids   uuid[] not null default '{}',
  created_by     uuid references auth.users(id) on delete set null,
  closed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_board_meetings_institution_id on public.board_meetings (institution_id);
create index idx_board_meetings_status on public.board_meetings (status);
create index idx_board_meetings_meeting_date on public.board_meetings (meeting_date);
create index idx_board_meetings_created_by on public.board_meetings (created_by);

create table public.board_meeting_documents (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete restrict,
  meeting_id        uuid not null references public.board_meetings(id) on delete cascade,
  storage_path      text not null,
  original_filename text not null,
  mime_type         text not null,
  file_size_bytes   bigint not null,
  sha256_hash       text not null,
  uploaded_by       uuid references auth.users(id) on delete set null,
  uploaded_at       timestamptz not null default now()
);

create index idx_board_meeting_documents_institution_id on public.board_meeting_documents (institution_id);
create index idx_board_meeting_documents_meeting_id on public.board_meeting_documents (meeting_id);

create table public.board_resolutions (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete restrict,
  meeting_id        uuid not null references public.board_meetings(id) on delete cascade,
  resolution_number integer not null,
  motion_text       text not null,
  proposer_id       uuid not null references auth.users(id) on delete restrict,
  seconder_id       uuid references auth.users(id) on delete set null,
  vote_outcome      public.resolution_outcome not null,
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create unique index idx_board_resolutions_meeting_number on public.board_resolutions (meeting_id, resolution_number);
create index idx_board_resolutions_institution_id on public.board_resolutions (institution_id);
create index idx_board_resolutions_meeting_id on public.board_resolutions (meeting_id);

create table public.board_action_items (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  meeting_id     uuid not null references public.board_meetings(id) on delete cascade,
  resolution_id  uuid references public.board_resolutions(id) on delete set null,
  title          text not null,
  description    text,
  owner_id       uuid references auth.users(id) on delete set null,
  due_date       date not null,
  status         public.action_item_status not null default 'open',
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_board_action_items_institution_id on public.board_action_items (institution_id);
create index idx_board_action_items_meeting_id on public.board_action_items (meeting_id);
create index idx_board_action_items_owner_id on public.board_action_items (owner_id);
create index idx_board_action_items_due_date on public.board_action_items (due_date);
create index idx_board_action_items_status on public.board_action_items (status);

insert into storage.buckets (id, name, public)
values ('board-packs', 'board-packs', false);
