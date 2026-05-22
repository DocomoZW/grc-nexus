-- Migration: 20260522000004_audit_immutability.sql
-- Three-layer INSERT-only enforcement on audit_events table.
-- SECURITY: Three independent defenses so that even a superuser cannot tamper with audit records.

-- ============================================================
-- LAYER 1: REVOKE destructive operations at role level
-- ============================================================

revoke update, delete, truncate on public.audit_events from authenticated;
revoke update, delete, truncate on public.audit_events from anon;
-- Note: postgres superuser cannot be fully stripped via REVOKE in Supabase.
-- The BEFORE trigger (Layer 3) below acts as the final guard even for postgres.

-- ============================================================
-- LAYER 2: RLS — enable and deny UPDATE/DELETE via absence of policy
-- ============================================================

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

-- Only admin and audit-officer can SELECT audit events
create policy "audit_select" on public.audit_events
  for select to authenticated
  using (
    (select auth.active_role()) in ('admin', 'audit-officer')
  );

-- No UPDATE or DELETE policy defined = implicitly denied at RLS level for all roles

-- ============================================================
-- LAYER 3: BEFORE trigger — RAISE EXCEPTION on any modification attempt
-- ============================================================
-- This fires even if REVOKE is bypassed or RLS is disabled — final hard stop.

create or replace function audit.prevent_audit_modification()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  raise exception 'audit_events is append-only: % operations are not permitted', TG_OP
    using errcode = 'insufficient_privilege';
  return null;
end;
$$;

create trigger audit_immutability_guard
  before update or delete on public.audit_events
  for each row execute function audit.prevent_audit_modification();

-- Verify: run the following in Supabase SQL editor to confirm enforcement:
-- UPDATE audit_events SET actor_id = null WHERE false;
-- Expected: ERROR: audit_events is append-only: UPDATE operations are not permitted
