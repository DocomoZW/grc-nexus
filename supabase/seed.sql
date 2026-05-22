-- supabase/seed.sql
-- Convenience copy of migration 20260522000006_seed.sql for `supabase db reset` in local dev.
-- SECURITY WARNING: Change Admin@GRC2026! immediately after any non-dev deployment.
-- Credentials: admin@grcnexus.gov.zw / Admin@GRC2026!

BEGIN;

DO $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001'; -- deterministic for demo
  v_inst_id  uuid := '00000000-0000-0000-0000-000000000010';
begin

  -- Create demo institution
  insert into public.institutions (id, name, type, created_at, updated_at)
  values (v_inst_id, 'Ministry of Finance', 'ministry', now(), now())
  on conflict (id) do nothing;

  -- Insert into auth.users
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@grcnexus.gov.zw',
    extensions.crypt('Admin@GRC2026!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"System","last_name":"Administrator"}',
    now(), now()
  ) on conflict (id) do nothing;

  -- auth.identities entry is REQUIRED for email login (RESEARCH.md Pitfall 2)
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_admin_id,
    v_admin_id,
    format('{"sub":"%s","email":"admin@grcnexus.gov.zw"}', v_admin_id)::jsonb,
    'email',
    v_admin_id::text,
    now(), now(), now()
  ) on conflict (id) do nothing;

  -- Create user_profile (status=approved; active_role=admin)
  insert into public.user_profiles (
    id, institution_id, first_name, last_name, status, active_role, created_at, updated_at
  ) values (
    v_admin_id, v_inst_id, 'System', 'Administrator', 'approved', 'admin', now(), now()
  ) on conflict (id) do nothing;

  -- Assign admin role
  insert into public.user_roles (user_id, institution_id, role_name, assigned_at)
  values (v_admin_id, v_inst_id, 'admin', now())
  on conflict (user_id, institution_id, role_name) do nothing;

end $$;

COMMIT;
