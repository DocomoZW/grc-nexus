-- Migration: 20260522000005_custom_access_token_hook.sql
-- Custom Access Token Hook — injects institution_id, roles, active_role, status into JWT app_metadata.
-- SECURITY: set search_path = '' prevents search_path injection.
-- SECURITY: Uses app_metadata (not user_metadata — users can modify user_metadata via client SDK).
-- After deploying: enable in Supabase Dashboard → Authentication → Hooks → "Custom Access Token".

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_institution_id uuid;
  v_dept_id uuid;
  v_roles text[];
  v_active_role text;
  v_status text;
  claims jsonb;
begin
  v_user_id := (event->>'user_id')::uuid;
  claims := event->'claims';

  -- Fetch profile data
  select
    up.institution_id,
    up.dept_id,
    up.status::text,
    up.active_role::text
  into v_institution_id, v_dept_id, v_status, v_active_role
  from public.user_profiles up
  where up.id = v_user_id;

  -- Fetch all assigned roles for this user
  select array_agg(ur.role_name::text) into v_roles
  from public.user_roles ur
  where ur.user_id = v_user_id;

  -- Inject claims into app_metadata
  -- SECURITY: Always inject into app_metadata (not user_metadata)
  claims := jsonb_set(claims, '{app_metadata,institution_id}',
    to_jsonb(coalesce(v_institution_id::text, '')));
  claims := jsonb_set(claims, '{app_metadata,dept_id}',
    to_jsonb(coalesce(v_dept_id::text, '')));
  claims := jsonb_set(claims, '{app_metadata,active_role}',
    to_jsonb(coalesce(v_active_role, '')));
  claims := jsonb_set(claims, '{app_metadata,roles}',
    to_jsonb(coalesce(v_roles, array[]::text[])));
  claims := jsonb_set(claims, '{app_metadata,status}',
    to_jsonb(coalesce(v_status, 'pending')));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Grant execute to Supabase auth system ONLY
-- This function should NEVER be callable by authenticated users or anon
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Grant read access so the hook can query profile and role data
grant select on public.user_profiles to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;

-- ============================================================
-- MANUAL STEP REQUIRED (cannot be done via SQL)
-- ============================================================
-- After this migration is pushed, activate the hook in Supabase Dashboard:
-- Authentication → Hooks → "Customize access token (JWT) claims"
-- → select function: public.custom_access_token_hook
-- ============================================================
