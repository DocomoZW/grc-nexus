-- Phase 11: Notifications RLS
-- Migration: 20260527000002_notifications_rls.sql

-- Users can only see their own notifications within their institution
create policy "users_select_own_notifications"
  on public.notifications for select
  using (
    institution_id = (select public.institution_id())
    and user_id = auth.uid()
  );

-- System (service role) inserts notifications; no direct user insert
create policy "service_insert_notifications"
  on public.notifications for insert
  with check (
    institution_id = (select public.institution_id())
  );

-- Users can update read_at on their own notifications (mark read)
create policy "users_update_own_notifications"
  on public.notifications for update
  using (
    institution_id = (select public.institution_id())
    and user_id = auth.uid()
  )
  with check (
    institution_id = (select public.institution_id())
    and user_id = auth.uid()
  );
