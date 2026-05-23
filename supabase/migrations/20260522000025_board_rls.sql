-- Migration: 20260522000025_board_rls.sql
-- Phase 5 Board Management: RLS policies and Storage rules.

alter table public.board_meetings enable row level security;
alter table public.board_meetings force row level security;

create policy "board_meetings_select" on public.board_meetings
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "board_meetings_insert" on public.board_meetings
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'board-member', 'board-secretary')
  );

create policy "board_meetings_update" on public.board_meetings
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'board-member', 'board-secretary')
  );

alter table public.board_meeting_documents enable row level security;
alter table public.board_meeting_documents force row level security;

create policy "board_meeting_documents_select" on public.board_meeting_documents
  for select to authenticated
  using (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'board-member', 'board-secretary', 'audit-officer')
  );

create policy "board_meeting_documents_insert" on public.board_meeting_documents
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'board-secretary', 'board-member')
  );

alter table public.board_resolutions enable row level security;
alter table public.board_resolutions force row level security;

create policy "board_resolutions_select" on public.board_resolutions
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "board_resolutions_insert" on public.board_resolutions
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'board-member', 'board-secretary')
    and exists (
      select 1
      from public.board_meetings m
      where m.id = meeting_id
        and m.status = 'in_progress'
    )
  );

alter table public.board_action_items enable row level security;
alter table public.board_action_items force row level security;

create policy "board_action_items_select" on public.board_action_items
  for select to authenticated
  using (institution_id = (select public.institution_id()));

create policy "board_action_items_insert" on public.board_action_items
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'board-member', 'board-secretary')
    and exists (
      select 1
      from public.board_meetings m
      where m.id = meeting_id
        and m.status <> 'closed'
    )
  );

create policy "board_action_items_update" on public.board_action_items
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'board-member', 'board-secretary')
    and exists (
      select 1
      from public.board_meetings m
      where m.id = meeting_id
        and m.status <> 'closed'
    )
  );

create policy "board_packs_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'board-packs'
    and (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'institution_id')
    and (select public.active_role()) in ('admin', 'ceo', 'board-member', 'board-secretary', 'audit-officer')
  );

create policy "board_packs_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'board-packs'
    and (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'institution_id')
    and (select public.active_role()) in ('admin', 'board-member', 'board-secretary')
  );
