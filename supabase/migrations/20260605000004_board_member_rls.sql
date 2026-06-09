-- Migration: 20260605000004_board_member_rls.sql
-- Row Level Security policies for board_members table

-- ============================================================
-- RLS ENABLE
-- ============================================================

alter table public.board_members enable row level security;

-- ============================================================
-- POLICIES
-- ============================================================

-- Select: Users can view board members in their own institution
-- Admin, board-member, ceo, audit-officer, risk-officer can view
-- Institution-scoped via institution_id

create policy "board_members_select_institution"
  on public.board_members
  for select
  using (
    institution_id = coalesce(
      (select public.institution_id()),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Insert: Only admin and board configuration managers can add board members
-- In practice, this is done via admin or a specific board-management role

create policy "board_members_insert_admin"
  on public.board_members
  for insert
  with check (
    institution_id = coalesce(
      (select public.institution_id()),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
    and exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and institution_id = public.board_members.institution_id
        and role_name in ('admin', 'audit-officer')
    )
  );

-- Update: Only admin and audit-officer can update board member records

create policy "board_members_update_admin"
  on public.board_members
  for update
  using (
    institution_id = coalesce(
      (select public.institution_id()),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
    and exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and institution_id = public.board_members.institution_id
        and role_name in ('admin', 'audit-officer')
    )
  );

-- Delete: Only admin can delete board member records

create policy "board_members_delete_admin"
  on public.board_members
  for delete
  using (
    institution_id = coalesce(
      (select public.institution_id()),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
    and exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and institution_id = public.board_members.institution_id
        and role_name = 'admin'
    )
  );

-- ============================================================
-- SERVICE ROLE BYPASS (for compliance engine, background jobs)
-- ============================================================

-- The compliance engine and other service-side functions use service_role
-- which bypasses RLS by default. No additional policy needed.

-- ============================================================
-- COMMENTS
-- ============================================================

comment on policy "board_members_select_institution" on public.board_members is 'Institution-scoped read access for all roles within the institution';
comment on policy "board_members_insert_admin" on public.board_members is 'Admin and audit-officer can add board members';
comment on policy "board_members_update_admin" on public.board_members is 'Admin and audit-officer can update board member records';
comment on policy "board_members_delete_admin" on public.board_members is 'Only admin can delete board member records';
