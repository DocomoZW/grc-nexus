-- Migration: 20260522000001_base_schema.sql
-- Phase 1 Foundation: All base tables for GRC-Nexus authentication and audit trail
-- SECURITY: RLS is enabled in a subsequent migration (0002_rls_policies.sql)

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type public.app_role as enum (
  'admin', 'board-member', 'ceo', 'risk-officer', 'audit-officer', 'dept-head'
);

create type public.user_status as enum ('pending', 'approved', 'suspended');

create type public.institution_type as enum ('ministry', 'department', 'agency', 'soe');

-- audit_action includes AUTH for application-level auth events (login/logout/permission changes)
-- that are not database row mutations
create type public.audit_action as enum ('INSERT', 'UPDATE', 'DELETE', 'AUTH');

-- ============================================================
-- INSTITUTIONS
-- ============================================================

create table public.institutions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         public.institution_type not null,
  logo_url     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_institutions_type on public.institutions (type);

-- ============================================================
-- USER PROFILES (extends auth.users 1:1)
-- ============================================================

create table public.user_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete restrict,
  dept_id        uuid,                          -- references departments(id) — added in future phase
  first_name     text,
  last_name      text,
  status         public.user_status not null default 'pending',
  active_role    public.app_role,               -- currently selected role for this session
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_user_profiles_institution_id on public.user_profiles (institution_id);
create index idx_user_profiles_status on public.user_profiles (status);

-- ============================================================
-- USER ROLES (many-to-many: a user can hold multiple roles per institution)
-- ============================================================

create table public.user_roles (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  role_name      public.app_role not null,
  assigned_by    uuid references auth.users(id) on delete set null,
  assigned_at    timestamptz not null default now(),
  unique (user_id, institution_id, role_name)
);

create index idx_user_roles_user_id on public.user_roles (user_id);
create index idx_user_roles_institution_id on public.user_roles (institution_id);

-- ============================================================
-- MFA DEVICE TRUST (30-day remembered devices)
-- ============================================================

create table public.mfa_device_trust (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token_hash  text not null,                    -- SHA-256 hash of device trust token
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  unique (user_id, token_hash)
);

create index idx_mfa_device_trust_user_id on public.mfa_device_trust (user_id);
create index idx_mfa_device_trust_expires_at on public.mfa_device_trust (expires_at);

-- ============================================================
-- MFA BACKUP CODES (8 per user, bcrypt-hashed, single-use)
-- ============================================================

create table public.mfa_backup_codes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  code_hash   text not null,                    -- bcrypt hash of the plain code (cost factor 12)
  used_at     timestamptz,                      -- null = unused; set when consumed (single-use)
  created_at  timestamptz not null default now()
);

create index idx_mfa_backup_codes_user_id on public.mfa_backup_codes (user_id);

-- ============================================================
-- MFA EMAIL OTP CHALLENGES (custom email OTP second factor)
-- Supabase does not support email as MFA factor type natively (GitHub #29082).
-- Records pending email OTP codes — 10-minute TTL enforced in application.
-- ============================================================

create table public.mfa_otp_challenges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code_hash   text not null,                    -- bcrypt hash of 6-digit OTP
  expires_at  timestamptz not null,             -- 10 minutes from creation
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_mfa_otp_challenges_user_id on public.mfa_otp_challenges (user_id);

-- ============================================================
-- AUDIT EVENTS (append-only, SECURITY DEFINER populated)
-- NOTE: INSERT-only enforcement applied in migration 0004_audit_immutability.sql
-- ============================================================

create table public.audit_events (
  id           bigint generated always as identity primary key,
  actor_id     uuid references auth.users(id) on delete set null,
  action       public.audit_action not null,
  table_name   text not null,
  record_id    text not null,
  before_state jsonb,                           -- null for INSERT
  after_state  jsonb,                           -- null for DELETE
  occurred_at  timestamptz not null default now(),
  -- Auth event fields (used when action = 'AUTH')
  event_type   text,                            -- 'login' | 'logout' | 'role_change' | 'mfa_enrolled' | etc.
  metadata     jsonb                            -- additional context (IP, user agent, role, etc.)
);

create index idx_audit_events_actor_id on public.audit_events (actor_id);
create index idx_audit_events_table_name on public.audit_events (table_name);
create index idx_audit_events_record_id on public.audit_events (record_id);
create index idx_audit_events_occurred_at on public.audit_events (occurred_at desc);
-- Composite index for the audit viewer filter panel (actor + table + time is the most common filter combination)
create index idx_audit_events_table_actor on public.audit_events (table_name, actor_id, occurred_at desc);
