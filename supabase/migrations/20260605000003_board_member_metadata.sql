-- Migration: 20260605000003_board_member_metadata.sql
-- Adds board_members table with metadata for PECG Act compliance engine
-- Enables chair-CEO conflict detection, independence tracking, and board composition analysis

-- ============================================================
-- ENUMS
-- ============================================================

create type public.board_member_status as enum (
  'active',
  'suspended',
  'terminated',
  'expired'
);

create type public.independence_status as enum (
  'independent',
  'not_independent',
  'under_review',
  'unknown'
);

create type public.board_member_role as enum (
  'chair',
  'vice_chair',
  'member',
  'ceo',
  'executive_director',
  'non_executive_director',
  'independent_director',
  'alternate'
);

-- ============================================================
-- TABLE: board_members
-- Dedicated board member records with metadata for compliance
-- ============================================================

create table public.board_members (
  id                      uuid primary key default gen_random_uuid(),
  institution_id          uuid not null references public.institutions(id) on delete restrict,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  
  -- Identity & role
  role                    public.board_member_role not null default 'member',
  is_chair                boolean not null default false,
  is_ceo                  boolean not null default false,
  is_executive            boolean not null default false,
  
  -- Independence assessment
  independence_status     public.independence_status not null default 'unknown',
  independence_rationale  text,                    -- Explanation for independence determination
  independence_reviewed_at timestamptz,              -- When independence was last assessed
  independence_reviewed_by uuid references auth.users(id) on delete set null,
  
  -- Appointment & term
  appointed_at            date not null,
  appointed_by            text,                    -- e.g., 'Minister of Finance', 'CGU', 'Board'
  term_years              integer not null default 3,
  term_expires_at         date,
  
  -- Board membership tracking
  board_count             integer not null default 1,  -- How many boards this member sits on
  is_in_database          boolean not null default true,  -- PECG Act Section 30: Database inclusion
  
  -- Metadata
  qualifications          jsonb default '[]',      -- e.g., ["MBA", "CPA", "Law"]
  committee_memberships     jsonb default '[]',      -- e.g., ["Audit", "Risk", "Remuneration"]
  
  -- Compliance tracking
  last_reviewed_at        timestamptz,              -- For BOARD_SELF_ASSESSMENT
  last_assessment_score   numeric(5,2),             -- Board effectiveness score
  
  -- Status
  status                  public.board_member_status not null default 'active',
  
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  
  -- Constraints
  unique (institution_id, user_id, role)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_board_members_institution_id on public.board_members (institution_id);
create index idx_board_members_user_id on public.board_members (user_id);
create index idx_board_members_role on public.board_members (role);
create index idx_board_members_is_chair on public.board_members (is_chair) where is_chair = true;
create index idx_board_members_is_ceo on public.board_members (is_ceo) where is_ceo = true;
create index idx_board_members_status on public.board_members (status);
create index idx_board_members_independence on public.board_members (independence_status);

-- ============================================================
-- TRIGGER: Updated at
-- ============================================================

create or replace function public.handle_board_members_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger board_members_updated_at
  before update on public.board_members
  for each row
  execute function public.handle_board_members_updated_at();

-- ============================================================
-- TRIGGER: Prevent chair-CEO conflict
-- Database-level constraint to prevent same person being both chair and CEO
-- ============================================================

create or replace function public.prevent_chair_ceo_conflict()
returns trigger as $$
begin
  -- If setting is_chair = true, check if this user is already CEO in this institution
  if new.is_chair then
    if exists (
      select 1 from public.board_members
      where institution_id = new.institution_id
        and user_id = new.user_id
        and is_ceo = true
        and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) or new.is_ceo then
      raise exception 'Chairperson cannot also be CEO (PECG Act Section 8 / ZimCode Principle 2.1)';
    end if;
  end if;

  -- If setting is_ceo = true, check if this user is already chair in this institution
  if new.is_ceo then
    if exists (
      select 1 from public.board_members
      where institution_id = new.institution_id
        and user_id = new.user_id
        and is_chair = true
        and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) or new.is_chair then
      raise exception 'CEO cannot also be Chairperson (PECG Act Section 8 / ZimCode Principle 2.1)';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger board_members_prevent_chair_ceo_conflict
  before insert or update on public.board_members
  for each row
  execute function public.prevent_chair_ceo_conflict();

-- ============================================================
-- TRIGGER: Chair must be independent
-- ============================================================

create or replace function public.chair_must_be_independent()
returns trigger as $$
begin
  if new.is_chair and new.independence_status != 'independent' then
    raise exception 'Chairperson must have independence_status = independent (PECG Act Section 8)';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger board_members_chair_independence
  before insert or update on public.board_members
  for each row
  execute function public.chair_must_be_independent();

-- ============================================================
-- FUNCTION: Check chair-CEO conflict for compliance engine
-- Returns conflict details if any
-- ============================================================

create or replace function public.check_chair_ceo_conflict(
  p_institution_id uuid
)
returns jsonb as $$
declare
  result jsonb;
  chair_record public.board_members;
  ceo_record public.board_members;
begin
  -- Find chair
  select * into chair_record
  from public.board_members
  where institution_id = p_institution_id
    and is_chair = true
    and status = 'active'
  limit 1;

  -- Find CEO
  select * into ceo_record
  from public.board_members
  where institution_id = p_institution_id
    and is_ceo = true
    and status = 'active'
  limit 1;

  -- Build result
  result := jsonb_build_object(
    'has_chair', chair_record.id is not null,
    'has_ceo', ceo_record.id is not null,
    'chair_id', chair_record.id,
    'chair_user_id', chair_record.user_id,
    'ceo_id', ceo_record.id,
    'ceo_user_id', ceo_record.user_id,
    'conflict', (chair_record.id is not null and ceo_record.id is not null and chair_record.user_id = ceo_record.user_id),
    'chair_is_independent', chair_record.independence_status = 'independent',
    'chair_independence_status', chair_record.independence_status,
    'checked_at', now()
  );

  return result;
end;
$$ language plpgsql stable;

-- ============================================================
-- FUNCTION: Get board composition for compliance
-- ============================================================

create or replace function public.get_board_composition(
  p_institution_id uuid
)
returns jsonb as $$
declare
  result jsonb;
  total_count integer;
  female_count integer;
  civil_servant_count integer;
  independent_count integer;
  executive_count integer;
begin
  select count(*) into total_count
  from public.board_members
  where institution_id = p_institution_id and status = 'active';

  select count(*) into female_count
  from public.board_members bm
  join public.user_profiles up on bm.user_id = up.id
  where bm.institution_id = p_institution_id
    and bm.status = 'active'
    and up.gender = 'female';

  select count(*) into civil_servant_count
  from public.board_members
  where institution_id = p_institution_id
    and status = 'active'
    and is_civil_servant = true;  -- Will be added to user_profiles

  select count(*) into independent_count
  from public.board_members
  where institution_id = p_institution_id
    and status = 'active'
    and independence_status = 'independent';

  select count(*) into executive_count
  from public.board_members
  where institution_id = p_institution_id
    and status = 'active'
    and is_executive = true;

  result := jsonb_build_object(
    'total_members', total_count,
    'female_count', female_count,
    'female_ratio', case when total_count > 0 then female_count::numeric / total_count else 0 end,
    'civil_servant_count', civil_servant_count,
    'civil_servant_ratio', case when total_count > 0 then civil_servant_count::numeric / total_count else 0 end,
    'independent_count', independent_count,
    'independent_ratio', case when total_count > 0 then independent_count::numeric / total_count else 0 end,
    'executive_count', executive_count,
    'executive_ratio', case when total_count > 0 then executive_count::numeric / total_count else 0 end,
    'has_chair', exists(select 1 from public.board_members where institution_id = p_institution_id and is_chair = true and status = 'active'),
    'has_ceo', exists(select 1 from public.board_members where institution_id = p_institution_id and is_ceo = true and status = 'active'),
    'checked_at', now()
  );

  return result;
end;
$$ language plpgsql stable;

-- ============================================================
-- RLS POLICIES (enabled in separate migration)
-- ============================================================

alter table public.board_members enable row level security;

-- Users can view board members in their institution
-- Admin/board roles can manage board members
-- (RLS policies added in 20260605000004_board_member_rls.sql)

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.board_members is 'Board member records with metadata for PECG Act compliance. Includes role, independence status, and term tracking.';
comment on column public.board_members.is_chair is 'Whether this member is the board chairperson. Enforced unique per institution at application level.';
comment on column public.board_members.is_ceo is 'Whether this member is the CEO. Should be mutually exclusive with is_chair.';
comment on column public.board_members.independence_status is 'Independence assessment for compliance (PECG Act Section 8). Chair must be independent.';
comment on column public.board_members.board_count is 'Number of boards this member sits on (PECG Act Section 30 - limit 3).';
comment on column public.board_members.is_in_database is 'Whether member is included in the national database (PECG Act Section 30).';
