-- Migration: 20260522000003_audit_triggers.sql
-- SECURITY DEFINER trigger function for immutable audit trail on all governance tables.
-- SECURITY: function uses set search_path = '' to prevent search_path injection attacks.
-- SECURITY: Sensitive fields excluded from before_state/after_state JSONB captures.
-- Note: audit_events INSERT-only enforcement is in migration 0004_audit_immutability.sql

-- ============================================================
-- AUDIT SCHEMA
-- ============================================================

create schema if not exists audit;

-- ============================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================
-- Fires AFTER INSERT/UPDATE/DELETE on governance tables.
-- Runs as the function owner (postgres superuser) via SECURITY DEFINER — bypasses RLS.
-- Actor captured from JWT; falls back to null for seed scripts and migrations.
-- Sensitive fields excluded: passwords, tokens (these should never be in governance tables,
-- but exclusion is defensive in case of schema evolution).

create or replace function audit.create_audit_event()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_record_id text;
  v_before_state jsonb;
  v_after_state jsonb;
  -- SECURITY: Fields to EXCLUDE from audit captures
  -- These should never appear in governance table rows, but exclusion is defensive
  v_excluded_fields text[] := array[
    'password', 'encrypted_password', 'hashed_token',
    'recovery_token', 'email_change_token_new',
    'email_change_token_current', 'reauthentication_token'
  ];
begin
  -- Get actor from JWT; fall back to null for seed scripts / migrations
  begin
    v_actor_id := (auth.jwt()->>'sub')::uuid;
  exception when others then
    v_actor_id := null;
  end;

  -- Determine record_id from the 'id' column (assumed uuid PK on all governance tables)
  if TG_OP = 'DELETE' then
    v_record_id := OLD.id::text;
  else
    v_record_id := NEW.id::text;
  end if;

  -- Capture before/after states with sensitive field exclusion
  if TG_OP = 'DELETE' then
    v_before_state := (to_jsonb(OLD) - v_excluded_fields);
    v_after_state  := null;
  elsif TG_OP = 'INSERT' then
    v_before_state := null;
    v_after_state  := (to_jsonb(NEW) - v_excluded_fields);
  else -- UPDATE
    v_before_state := (to_jsonb(OLD) - v_excluded_fields);
    v_after_state  := (to_jsonb(NEW) - v_excluded_fields);
  end if;

  insert into public.audit_events (
    actor_id,
    action,
    table_name,
    record_id,
    before_state,
    after_state,
    occurred_at
  ) values (
    v_actor_id,
    TG_OP::public.audit_action,
    TG_TABLE_NAME,
    v_record_id,
    v_before_state,
    v_after_state,
    now()
  );

  return coalesce(NEW, OLD);
end;
$$;

-- Grant INSERT on audit_events to postgres (the SECURITY DEFINER trigger runs as postgres)
grant insert on public.audit_events to postgres;

-- ============================================================
-- AUDIT TRIGGER ATTACHMENT HELPER
-- ============================================================
-- Creates an AFTER INSERT OR UPDATE OR DELETE trigger on the specified governance table.
-- Called once per table in this migration; subsequent phase migrations call it for new tables.

create or replace function audit.attach_audit_trigger(p_table_name text)
  returns void
  language plpgsql
  set search_path = ''
as $$
begin
  execute format(
    'create trigger audit_trigger
     after insert or update or delete on public.%I
     for each row execute function audit.create_audit_event()',
    p_table_name
  );
end;
$$;

-- ============================================================
-- ATTACH TRIGGERS TO PHASE 1 GOVERNANCE TABLES
-- ============================================================
-- Future phases: add `select audit.attach_audit_trigger('<table_name>');` in their migrations.

select audit.attach_audit_trigger('institutions');
select audit.attach_audit_trigger('user_profiles');
select audit.attach_audit_trigger('user_roles');
