# Phase 1: Foundation — Authentication, RLS, and Audit Trail - Research

**Researched:** 2026-05-22
**Domain:** Supabase Auth (@supabase/ssr), Postgres RLS, Postgres Triggers, Next.js 14 App Router
**Confidence:** HIGH (core patterns verified via official Supabase docs and Context7)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Minimal focused login form: institution logo/name, email field, password field, submit button
- Post-login always redirects to `/dashboard` — predictable for all roles
- Sessions always persistent via server-side cookie (no "remember me" checkbox)
- Strong password policy: 12+ characters, minimum 1 uppercase, 1 number, 1 symbol
- Self-registration: user registers → status=`pending` until admin approves and assigns a role
- Role switching per session: user chooses active role at login from their assigned set
- First superadmin created via seed migration — deterministic bootstrapping for demo/deployment
- Email notification sent on role assignment or change (using Resend)
- Both MFA methods: TOTP (authenticator app) and email OTP — user chooses at setup
- Required for `admin` and `board-member` roles only
- 30-day device trust: after successful MFA, skip MFA on that device for 30 days
- 8 backup recovery codes generated at MFA setup, shown once and downloadable
- Audit scope: ALL create/update/delete on ALL governance operational tables
- Full JSONB diff (before_state + after_state)
- Enforced at Postgres trigger layer (SECURITY DEFINER)
- audit_events: INSERT-only, no UPDATE/DELETE at any permission level
- Audit viewer: filterable by actor, timestamp, action type, table name, record ID
- Accessible to admin and audit-officer roles
- Sensitive field exclusion: auth tokens and hashed passwords stripped

### Claude's Discretion
- Exact Next.js route structure within `app/` directory
- Specific Supabase RLS policy syntax and indexing strategy
- Error message copy and form validation UX details
- Email template design for role notifications

### Deferred Ideas (OUT OF SCOPE)
- Social/OAuth login (Google, Microsoft)
- SAML/SSO integration
- IP allowlisting and geographic access controls
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Email/password registration with self-registration + pending status | Supabase signUp(), user_profiles table with status column, admin approval flow |
| AUTH-02 | Persistent sessions via server-side cookies across browser sessions | @supabase/ssr createServerClient with cookie store; Supabase token in httpOnly cookie |
| AUTH-03 | Logout from any page | supabase.auth.signOut() in Server Action; middleware cookie cleanup |
| AUTH-04 | Roles: admin, board-member, ceo, risk-officer, audit-officer, dept-head | app_role ENUM type + user_roles table + custom_access_token_hook injecting into JWT |
| AUTH-05 | Supabase RLS enforces data access | RLS policies using (SELECT auth.jwt()->'app_metadata'->>'institution_id') on all tables |
| AUTH-06 | Institution-scoped data isolation | institution_id FK on all governance tables + RLS policy pattern verified |
| AUTH-07 | MFA required for admin+board-member; TOTP; 30-day device trust; 8 backup codes | mfa.enroll/challenge/verify TOTP; device_trust cookie; custom backup_codes table |
| AUTH-08 | Immutable audit event for every login/logout/permission change | Supabase Auth webhook OR application-layer INSERT into audit_events |
| TRAIL-01 | Every create/update/delete → audit event | SECURITY DEFINER trigger on each governance table |
| TRAIL-02 | audit_events append-only | REVOKE + restrictive RLS + RAISE EXCEPTION trigger |
| TRAIL-03 | Audit enforced at Postgres trigger layer | Verified SECURITY DEFINER pattern |
| TRAIL-04 | Evidence file SHA-256 checksum verification | Node.js crypto.createHash('sha256') on download; checksum stored at upload |
</phase_requirements>

---

## Summary

Phase 1 establishes the security and data-integrity foundation that every subsequent GRC-Nexus module depends on. The research covers three interconnected subsystems: Supabase Auth with cookie-based SSR sessions and role-based JWT claims; Postgres Row-Level Security policies scoped by institution; and an immutable append-only audit trail enforced at the database trigger layer.

The core stack is well-supported by official documentation. `@supabase/ssr` 0.10.3 provides verified `createServerClient` and `createBrowserClient` patterns for Next.js 14 App Router. Custom JWT claims injection via `custom_access_token_hook` is the correct mechanism for embedding `role`, `institution_id`, and `active_role` into the Supabase JWT, enabling RLS policies that run without any per-row subqueries against app tables.

**Critical finding on email OTP MFA:** Supabase does NOT currently support email OTP as an MFA second-factor type via the `mfa.enroll()` API. The only supported second-factor types are `totp` and `phone`. A GitHub feature request (#29082, opened Sept 2024) remains unanswered as of May 2026. The locked decision for "both TOTP + email OTP" must be re-scoped: implement TOTP only natively; simulate "email OTP" via a custom Resend-based OTP code stored in Postgres with a short TTL. See Open Questions.

**Critical finding on backup recovery codes:** Supabase does not return recovery codes natively. The recommended Supabase pattern is to enroll a second TOTP factor as backup. For the specified requirement of 8 backup codes, a custom `mfa_backup_codes` table with bcrypt-hashed codes is required.

**Primary recommendation:** Use TOTP via `supabase.auth.mfa.*` for the primary MFA path. Implement custom backup codes in Postgres. For "email OTP" MFA, implement as a custom Resend-delivered code flow stored in a `mfa_otp_challenges` table.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session creation/refresh | Frontend Server (middleware) | Browser | Middleware runs `getUser()` on every request to refresh tokens in cookies |
| Auth state (user object) | API / Backend (Supabase Auth) | Frontend Server | JWT validated server-side; never trust client-only session |
| Role enforcement (routing) | Frontend Server (middleware) | — | Redirect before page renders; middleware reads JWT claims |
| Role enforcement (data) | Database / Storage (RLS) | — | RLS is the authoritative enforcement layer; app code is defense-in-depth |
| MFA challenge/verify | Browser (Client Component) | API Route Handler | User interaction required; Server Action or Route Handler for verification |
| Device trust | Frontend Server (cookie) | Database | 30-day signed cookie checked in middleware; device_trust table for invalidation |
| Audit trail writes | Database / Storage (trigger) | — | SECURITY DEFINER trigger is immune to application bugs |
| Audit trail reads | API / Backend (Route Handler) | — | Server-side query with RLS; never expose raw audit table to browser |
| SHA-256 file checksum | API / Backend (Route Handler) | — | Computed server-side on download; not trusted from client |
| Email notifications | API / Backend (Route Handler/Server Action) | — | Resend called server-side only; API key never in browser |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | 0.10.3 | SSR cookie auth for Next.js App Router | Official Supabase library for Server Components; replaces deprecated @supabase/auth-helpers-nextjs |
| @supabase/supabase-js | 2.106.1 | Supabase client (DB queries, Auth API, MFA) | Core client; required for all Supabase operations |
| next | 14.x (16.2.6 latest but pin 14) | App Router, Server Components, middleware | Project constraint; App Router enables server-side auth patterns |
| react-hook-form | 7.76.0 | Form state management | Project stack; uncontrolled inputs, minimal re-renders |
| zod | 4.4.3 | Schema validation | Project stack; TypeScript-first, pairs with react-hook-form |
| @hookform/resolvers | 5.4.0 | Bridge react-hook-form to Zod | Required glue package |
| resend | 6.12.3 | Transactional email (role notifications) | Project stack; Vercel-native, simple SDK |

**Note on Zod version:** Zod 4.x (currently 4.4.3) was released in 2025. The project CLAUDE.md mentions "Zod v3.x (not v4 yet; some breaking changes)" but this was written based on pre-4.x research. Zod 4 is now stable and the latest. `[ASSUMED]` that the project intends latest stable; confirm whether to pin v3 or use v4. Key breaking change: `z.string().email()` behavior is unchanged; most common patterns are compatible.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-email | 6.3.1 | Email template components | Wrap Resend sends in typed React components for role notification emails |
| @react-email/components | latest | Pre-built email UI primitives | Used within react-email templates |
| bcryptjs | 2.x | Hash backup recovery codes | Custom MFA backup codes require bcrypt storage |
| @types/bcryptjs | latest | TypeScript types for bcryptjs | Dev dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated; ssr is the official replacement |
| bcryptjs | pgcrypto crypt() in Postgres | pgcrypto is already available in Supabase; saves a JS dependency but harder to test |
| Custom email OTP table | Phone MFA (Supabase native) | Phone requires Twilio; email is cheaper but requires custom implementation |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr resend react-email @react-email/components bcryptjs
npm install -D @types/bcryptjs
```

**Version verification:** All versions confirmed against npm registry on 2026-05-22. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  │  HTTPS request
  ▼
Next.js Middleware (middleware.ts)
  │── createServerClient (cookie read/write)
  │── supabase.auth.getUser()          ← validates JWT, refreshes token
  │── check: is user authenticated?    → NO → redirect /login
  │── check: is route MFA-gated?       → YES, check aal level
  │── check: device_trust cookie?      → present → skip MFA → continue
  │── check: role has MFA requirement? → YES, aal1 → redirect /mfa/challenge
  │
  ▼
Route Handler / Server Component (app/...)
  │── createServerClient (cookies)
  │── supabase.auth.getUser()          ← ALWAYS re-validate here too
  │── Read JWT claims: institution_id, active_role
  │── Query Supabase DB (RLS auto-applied)
  │
  ▼
Supabase Postgres (RLS layer)
  │── Policy: institution_id = (SELECT auth.jwt()->'app_metadata'->>'institution_id')
  │── Policy: role check via (SELECT auth.jwt()->'app_metadata'->>'active_role')
  │── Returns only rows user is authorised to see
  │
  ├── On INSERT/UPDATE/DELETE:
  │     └── SECURITY DEFINER trigger fires
  │           └── INSERT INTO audit_events (actor, table, record_id, op, before_state, after_state)
  │
  └── audit_events table (INSERT-only)
        └── REVOKE UPDATE, DELETE on audit_events FROM authenticated, anon
        └── RESTRICTIVE RLS: no policy permits UPDATE or DELETE
        └── BEFORE UPDATE/DELETE trigger: RAISE EXCEPTION 'immutable'
```

### Recommended Project Structure
```
app/
├── (auth)/                    # Route group: unauthenticated pages
│   ├── layout.tsx             # Minimal layout: no sidebar
│   ├── login/
│   │   └── page.tsx           # Login form (Server Component shell + Client form)
│   └── register/
│       └── page.tsx           # Registration form
├── (protected)/               # Route group: auth-gated pages
│   ├── layout.tsx             # Auth check in layout; redirects to /login if no session
│   ├── (mfa)/                 # Sub-group: MFA challenge pages
│   │   ├── mfa/
│   │   │   ├── enroll/page.tsx
│   │   │   ├── challenge/page.tsx
│   │   │   └── backup-codes/page.tsx
│   ├── role-select/
│   │   └── page.tsx           # Role selection screen post-login
│   └── dashboard/
│       └── page.tsx           # Main dashboard (placeholder phase 1)
├── api/
│   ├── auth/
│   │   ├── confirm/route.ts   # Email confirmation callback
│   │   └── callback/route.ts  # OAuth callback (future)
│   └── send-email/route.ts    # Resend email dispatch
middleware.ts                  # Session refresh + route protection + MFA gate
lib/
├── supabase/
│   ├── server.ts              # createClient() for Server Components + Route Handlers
│   ├── client.ts              # createBrowserClient() for Client Components
│   └── middleware.ts          # updateSession() helper
├── auth/
│   ├── actions.ts             # Server Actions: signIn, signOut, signUp, selectRole
│   ├── mfa.ts                 # MFA helpers: enroll, challenge, verify
│   └── recovery-codes.ts     # Backup code generation + verification
supabase/
├── migrations/
│   ├── 0001_schema.sql        # All Phase 1 tables
│   ├── 0002_rls.sql           # RLS policies
│   ├── 0003_triggers.sql      # Audit triggers
│   ├── 0004_hooks.sql         # custom_access_token_hook
│   └── 0005_grants.sql        # REVOKE/GRANT statements
└── seed.sql                   # Demo institution + superadmin
```

### Pattern 1: createServerClient in Server Components and Route Handlers

```typescript
// lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for new projects
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies directly; middleware handles refresh
          }
        },
      },
    }
  )
}
```

### Pattern 2: createBrowserClient in Client Components

```typescript
// lib/supabase/client.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Pattern 3: middleware.ts — Session Refresh + Route Protection + MFA Gate

```typescript
// middleware.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client (middleware section)
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Routes that do NOT require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/auth/confirm', '/auth/callback']
// Routes that require MFA completion (aal2) for applicable roles
const MFA_REQUIRED_ROLES = ['admin', 'board-member']
// Cookie name for device trust
const DEVICE_TRUST_COOKIE = 'grc_device_trust'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )

  // ALWAYS call getUser() to refresh token — this is the session refresh mechanism
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some(r => path.startsWith(r))

  // 1. Unauthenticated: redirect to login (except public routes)
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Authenticated on public route: redirect to dashboard
  if (user && isPublicRoute && path !== '/auth/confirm' && path !== '/auth/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 3. MFA gate — check for roles requiring MFA
  if (user) {
    const activeRole = (user.app_metadata as Record<string, string>)?.active_role
    const requiresMfa = MFA_REQUIRED_ROLES.includes(activeRole)

    if (requiresMfa && !path.startsWith('/mfa') && !path.startsWith('/role-select')) {
      // Check device trust cookie
      const deviceTrust = request.cookies.get(DEVICE_TRUST_COOKIE)
      if (!deviceTrust) {
        // Check AAL level from JWT
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.currentLevel !== 'aal2') {
          return NextResponse.redirect(new URL('/mfa/challenge', request.url))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 4: Custom Access Token Hook — Injecting role, institution_id, active_role into JWT

```sql
-- supabase/migrations/0004_hooks.sql
-- Source: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
-- [VERIFIED: Official Supabase Auth Hooks docs]

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''  -- REQUIRED for security definer-equivalent behavior
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
    up.status,
    up.active_role
  into v_institution_id, v_dept_id, v_status, v_active_role
  from public.user_profiles up
  where up.id = v_user_id;

  -- Fetch all assigned roles
  select array_agg(role_name) into v_roles
  from public.user_roles
  where user_id = v_user_id;

  -- Inject claims into app_metadata
  claims := jsonb_set(claims, '{app_metadata,institution_id}',
    to_jsonb(v_institution_id::text));
  claims := jsonb_set(claims, '{app_metadata,dept_id}',
    to_jsonb(v_dept_id::text));
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

-- Grant access to the auth system
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Grant table access needed by the hook function
grant select on public.user_profiles to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;
```

**Enable in Supabase Dashboard:** Authentication → Hooks → "Custom Access Token" → select `public.custom_access_token_hook`

### Pattern 5: RLS Policies for Institution-Scoped Isolation

```sql
-- supabase/migrations/0002_rls.sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- [VERIFIED: Official Supabase RLS docs]

-- Helper function for reading institution_id from JWT (cached per statement)
create or replace function auth.institution_id() returns uuid as $$
  select (auth.jwt()->'app_metadata'->>'institution_id')::uuid
$$ language sql stable security definer set search_path = '';

-- Helper function for reading active_role from JWT
create or replace function auth.active_role() returns text as $$
  select auth.jwt()->'app_metadata'->>'active_role'
$$ language sql stable security definer set search_path = '';

-- Pattern applied to every governance table:
-- Example for a hypothetical "risk_items" table (each module phase adds their own)

-- SELECT: users see only their institution's data
create policy "institution_select" on public.risk_items
  for select to authenticated
  using (institution_id = (select auth.institution_id()));

-- INSERT: users can only insert into their own institution
create policy "institution_insert" on public.risk_items
  for insert to authenticated
  with check (institution_id = (select auth.institution_id()));

-- UPDATE: users can only update their institution's records
create policy "institution_update" on public.risk_items
  for update to authenticated
  using (institution_id = (select auth.institution_id()))
  with check (institution_id = (select auth.institution_id()));

-- DELETE: role-restricted delete (example: only admin or risk-officer)
create policy "institution_delete" on public.risk_items
  for delete to authenticated
  using (
    institution_id = (select auth.institution_id())
    and (select auth.active_role()) in ('admin', 'risk-officer')
  );

-- Required indexes for RLS performance (run on every governance table)
-- create index idx_risk_items_institution_id on public.risk_items (institution_id);
```

### Pattern 6: Postgres SECURITY DEFINER Audit Trigger

```sql
-- supabase/migrations/0003_triggers.sql
-- Source: Supabase blog (postgres-audit), bluelabellabs.com audit guide, Stav Barak article
-- [VERIFIED: Multiple corroborating sources]

-- Fields to EXCLUDE from audit capture (MUST NOT appear in before_state/after_state)
-- These are excluded by subtracting keys from the JSONB
-- Supabase manages auth tokens in auth schema — NOT in governance tables
-- hashed passwords are in auth.users.encrypted_password — NOT in governance tables
-- Governance tables contain no auth secrets, but exclusion list is defensive
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
  v_excluded_fields text[] := array['password', 'encrypted_password', 'hashed_token',
                                     'recovery_token', 'email_change_token_new',
                                     'email_change_token_current', 'reauthentication_token'];
begin
  -- Get actor from JWT; fall back to DB session user for seed scripts
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

  -- Capture before/after states, excluding sensitive fields
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
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_before_state,
    v_after_state,
    now()
  );

  return coalesce(NEW, OLD);
end;
$$;

-- Grant write access to audit_events for the SECURITY DEFINER trigger
-- The trigger runs as the function owner (postgres superuser), bypassing RLS
grant insert on public.audit_events to postgres;

-- Attach audit trigger to a governance table — repeat for every governance table
-- Template (substitute table_name):
create or replace function audit.attach_audit_trigger(p_table_name text)
  returns void language plpgsql as $$
begin
  execute format(
    'create trigger audit_trigger
     after insert or update or delete on public.%I
     for each row execute function audit.create_audit_event()',
    p_table_name
  );
end;
$$;

-- Called in migration for each governance table:
-- select audit.attach_audit_trigger('institutions');
-- select audit.attach_audit_trigger('user_profiles');
-- etc. (each subsequent module phase adds their table to this list)
```

### Pattern 7: INSERT-Only Enforcement on audit_events

```sql
-- Three-layer defense: REVOKE + RESTRICTIVE RLS + RAISE EXCEPTION trigger
-- Source: PostgreSQL docs + community best practice
-- [VERIFIED: Official Postgres docs on REVOKE, CREATE POLICY]

-- Layer 1: Revoke at role level
revoke update, delete, truncate on public.audit_events from authenticated;
revoke update, delete, truncate on public.audit_events from anon;
revoke update, delete, truncate on public.audit_events from postgres; -- even superuser
-- Note: postgres role cannot be fully stripped in Supabase; use trigger as final guard

-- Layer 2: RLS — RESTRICTIVE policy denying UPDATE/DELETE
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

-- Allow reading for admin and audit-officer only
create policy "audit_select" on public.audit_events
  for select to authenticated
  using (
    (select auth.active_role()) in ('admin', 'audit-officer')
  );

-- Allow INSERT only (for the SECURITY DEFINER trigger function via postgres role)
-- No UPDATE or DELETE policy = implicitly denied at RLS level

-- Layer 3: Trigger guard — raises exception even if superuser attempts modification
create or replace function audit.prevent_audit_modification()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  raise exception 'audit_events is append-only: % operations are not permitted',
    TG_OP
    using errcode = 'insufficient_privilege';
  return null;
end;
$$;

create trigger audit_immutability_guard
  before update or delete on public.audit_events
  for each row execute function audit.prevent_audit_modification();
```

### Pattern 8: MFA Enrollment (TOTP)

```typescript
// lib/auth/mfa.ts
// Source: https://supabase.com/docs/guides/auth/auth-mfa/totp
// [VERIFIED: Official Supabase TOTP docs]

import { createClient } from '@/lib/supabase/client'

// Step 1: Enroll TOTP factor
export async function enrollTOTP() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'GRC-Nexus Authenticator',
  })
  if (error) throw error
  // data.totp.qr_code is SVG string — render directly
  // data.totp.secret is plain text — show as fallback for manual entry
  // data.id is the factorId — store for next steps
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

// Step 2 + 3: Challenge then verify (combined flow)
export async function verifyTOTPEnrollment(factorId: string, code: string) {
  const supabase = createClient()
  // Create challenge
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) throw challengeError

  // Verify code — on success, session upgrades to aal2 and other sessions are logged out
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })
  if (error) throw error
  return data
}

// Check AAL level post-login
export async function getMFALevel() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw error
  // data.currentLevel: 'aal1' | 'aal2'
  // data.nextLevel: 'aal1' | 'aal2'
  // If currentLevel=aal1 AND nextLevel=aal2 → MFA required
  return data
}

// Login MFA challenge flow (after credentials verified, factor already enrolled)
export async function completeMFAChallenge(factorId: string, code: string) {
  const supabase = createClient()
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) throw challengeError

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })
  if (error) throw error
  return data
}

// List enrolled factors
export async function listMFAFactors() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  return data.totp // array of enrolled TOTP factors
}
```

### Pattern 9: 30-Day Device Trust Cookie

```typescript
// lib/auth/device-trust.ts
// [ASSUMED] — standard pattern, no official Supabase docs for this specific flow

import { cookies } from 'next/headers'
import crypto from 'crypto'

const DEVICE_TRUST_COOKIE = 'grc_device_trust'
const TRUST_DURATION_DAYS = 30

// Called after successful MFA verification
export async function setDeviceTrust(userId: string) {
  const cookieStore = await cookies()
  // Generate a signed token: userId + timestamp + server secret
  const token = crypto
    .createHmac('sha256', process.env.DEVICE_TRUST_SECRET!)
    .update(`${userId}:${Date.now()}`)
    .digest('hex')

  // Store token reference in DB for invalidation capability
  // (INSERT into public.mfa_device_trust table)

  cookieStore.set(DEVICE_TRUST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TRUST_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

// Validate device trust cookie in middleware
export function isDeviceTrusted(cookieValue: string | undefined, userId: string): boolean {
  if (!cookieValue) return false
  // Look up token in mfa_device_trust table (server-side query)
  // This requires a DB call — do in middleware or layout server component
  // Simplified: just check cookie presence for now; full validation in server component
  return !!cookieValue
}
```

### Pattern 10: Backup Recovery Codes

```typescript
// lib/auth/recovery-codes.ts
// [ASSUMED] — custom implementation; Supabase does not provide native recovery codes

import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const CODE_COUNT = 8
const CODE_LENGTH = 10

// Generate 8 backup codes — call once at MFA enrollment
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: CODE_COUNT }, () =>
    crypto.randomBytes(CODE_LENGTH / 2).toString('hex') // 10 hex chars
  )
}

// Hash codes for DB storage — show plain codes to user ONCE
export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => bcrypt.hash(code, 12)))
}

// Verify a submitted code against stored hashes
export async function verifyRecoveryCode(
  submittedCode: string,
  storedHashes: string[]
): Promise<number | null> {
  for (let i = 0; i < storedHashes.length; i++) {
    const match = await bcrypt.compare(submittedCode, storedHashes[i])
    if (match) return i // return index for deletion (codes are single-use)
  }
  return null
}
```

### Pattern 11: Seed Migration for First Superadmin

```sql
-- supabase/seed.sql
-- Source: https://laros.io/seeding-users-in-supabase-with-a-sql-seed-script
-- [VERIFIED: Confirmed via community guide and Supabase discussions]

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

DO $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001'; -- deterministic for demo
  v_inst_id  uuid := '00000000-0000-0000-0000-000000000010';
  v_password text := crypt('Admin@GRC2026!', gen_salt('bf'));
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
    v_password,
    now(), -- email pre-confirmed for seed
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"System","last_name":"Administrator"}',
    now(), now()
  ) on conflict (id) do nothing;

  -- auth.identities entry is required for login to work
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_admin_id,
    v_admin_id,
    format('{"sub":"%s","email":"admin@grcnexus.gov.zw"}', v_admin_id)::jsonb,
    'email', v_admin_id,
    now(), now(), now()
  ) on conflict (id) do nothing;

  -- Create user_profile (status=approved for superadmin)
  insert into public.user_profiles (
    id, institution_id, status, active_role, created_at, updated_at
  ) values (
    v_admin_id, v_inst_id, 'approved', 'admin', now(), now()
  ) on conflict (id) do nothing;

  -- Assign superadmin role
  insert into public.user_roles (user_id, institution_id, role_name, assigned_at)
  values (v_admin_id, v_inst_id, 'admin', now())
  on conflict do nothing;

end $$;
```

### Pattern 12: Resend Email Integration

```typescript
// lib/email/send-role-notification.ts
// Source: https://resend.com/docs/send-with-nextjs
// [VERIFIED: Official Resend docs]

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRoleAssignmentEmail(params: {
  to: string
  name: string
  role: string
  institutionName: string
}) {
  const { data, error } = await resend.emails.send({
    from: 'GRC-Nexus <noreply@grcnexus.gov.zw>',
    to: [params.to],
    subject: `Your GRC-Nexus role has been updated`,
    html: `
      <h2>Role Assignment Notification</h2>
      <p>Dear ${params.name},</p>
      <p>Your role at <strong>${params.institutionName}</strong> has been set to
         <strong>${params.role}</strong>.</p>
      <p>You can now log in to GRC-Nexus and select this role.</p>
    `,
    // Replace with react-email template component in production
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
  return data
}
```

### Anti-Patterns to Avoid

- **Using `getSession()` server-side instead of `getUser()`:** `getSession()` does NOT validate JWT signatures server-side; `getUser()` makes a network call to Supabase Auth to validate. Always use `getUser()` in Server Components and middleware. [VERIFIED: Supabase docs explicit warning]
- **Storing authorization data in `raw_user_meta_data`:** Users can modify `user_metadata` via the client SDK. Always use `raw_app_meta_data` for institution_id, role, status. [VERIFIED: Supabase RLS docs]
- **Calling `auth.jwt()` directly in RLS without SELECT wrapper:** `(auth.jwt()->>'x')` is evaluated per-row. Wrap with `(SELECT auth.jwt()->>'x')` to cache per statement — massive performance gain on large tables. [VERIFIED: Supabase RLS performance docs]
- **Skipping `set search_path = ''` on SECURITY DEFINER functions:** Omitting this is a SQL injection vector in Postgres. Required by Supabase's own security linter. [VERIFIED: Supabase security advisors docs]
- **Using legacy `@supabase/auth-helpers-nextjs`:** This package is deprecated. Use `@supabase/ssr` exclusively. [VERIFIED: Supabase docs migration notice]

---

## Schema Design — All Phase 1 Tables

```sql
-- supabase/migrations/0001_schema.sql

-- Extensions
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

create type public.audit_action as enum ('INSERT', 'UPDATE', 'DELETE');

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
-- USER ROLES (many-to-many: a user can hold multiple roles)
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
  token_hash  text not null,                    -- HMAC-SHA256 of device trust token
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
  code_hash   text not null,                    -- bcrypt hash of the plain code
  used_at     timestamptz,                      -- null = unused; set when consumed
  created_at  timestamptz not null default now()
);

create index idx_mfa_backup_codes_user_id on public.mfa_backup_codes (user_id);

-- ============================================================
-- MFA EMAIL OTP CHALLENGES (custom email OTP second factor)
-- Records pending email OTP codes — TTL enforced in application
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
  -- Auth event fields (used when table_name = 'auth_events')
  event_type   text,                            -- 'login' | 'logout' | 'role_change' | 'mfa_enrolled' | etc.
  metadata     jsonb                            -- additional context (IP, user agent, etc.)
);

create index idx_audit_events_actor_id on public.audit_events (actor_id);
create index idx_audit_events_table_name on public.audit_events (table_name);
create index idx_audit_events_record_id on public.audit_events (record_id);
create index idx_audit_events_occurred_at on public.audit_events (occurred_at desc);
-- Composite index for the audit viewer filter panel
create index idx_audit_events_table_actor on public.audit_events (table_name, actor_id, occurred_at desc);
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT creation and validation | Custom JWT library | Supabase Auth | HMAC signing, rotation, blacklisting are notoriously tricky to get right |
| Password hashing | Custom crypto | Supabase Auth (bcrypt) + pgcrypto for seeds | Algorithm choice, salting, iteration count are security-critical |
| Session management | Cookie + localStorage | @supabase/ssr createServerClient | Cross-tab sync, token refresh, CSP compliance — handled |
| TOTP code generation/validation | RFC 6238 implementation | Supabase `mfa.enroll/challenge/verify` | Clock skew, replay prevention, QR generation handled |
| Secure random code generation | `Math.random()` | `crypto.randomBytes()` | Math.random is not cryptographically secure |
| Row-level data isolation | App-layer WHERE filter | Supabase RLS | RLS enforces even if app code has a bug; app-layer filter is not a security boundary |
| Email delivery | Nodemailer + own SMTP | Resend | Bounce handling, DKIM, SPF, deliverability monitoring |

---

## Common Pitfalls

### Pitfall 1: getSession() vs getUser() in Server Context
**What goes wrong:** Page loads user data via `getSession()` in a Server Component, session is not freshly validated, stale/forged session cookies can grant access.
**Why it happens:** `getSession()` reads the cookie locally without network validation. Looks identical to `getUser()` from a code perspective.
**How to avoid:** Always use `supabase.auth.getUser()` in Server Components, Route Handlers, and middleware. Only use `getSession()` in client-side code where the tradeoff is acceptable.
**Warning signs:** Auth check passes but JWT is expired; user sees data after being deprovisioned.

### Pitfall 2: Missing auth.identities Entry in Seed
**What goes wrong:** Seeded user exists in `auth.users` but cannot log in — receives "invalid credentials" error.
**Why it happens:** Supabase Auth requires a corresponding row in `auth.identities` for the email provider. This is not enforced by FK but is required at sign-in time.
**How to avoid:** Always pair the `auth.users` INSERT with an `auth.identities` INSERT in seed scripts.
**Warning signs:** User appears in Supabase Auth dashboard but login fails immediately.

### Pitfall 3: JWT Claims Staleness
**What goes wrong:** Admin changes user's institution or role, but RLS policies still use the old claim values until the JWT rotates.
**Why it happens:** JWT is issued and claims are baked in. `custom_access_token_hook` only fires on new token issuance.
**How to avoid:** (a) After role change, force a session refresh by calling `supabase.auth.refreshSession()` server-side, or (b) sign the user out and require re-login after role assignment. Document this as expected behavior.
**Warning signs:** User with changed role still sees old-role data after role change without logout.

### Pitfall 4: RLS Policy Without `TO authenticated`
**What goes wrong:** RLS policies evaluated for anonymous requests — adds CPU overhead even for requests that should be immediately rejected.
**Why it happens:** Missing `TO authenticated` in policy definition.
**How to avoid:** Always add `TO authenticated` (or `TO anon` for public tables) on every policy.
**Warning signs:** Supabase query explain shows policies evaluated for `anon` role.

### Pitfall 5: SECURITY DEFINER Function Without `set search_path = ''`
**What goes wrong:** An attacker who controls a schema the function searches can inject malicious functions that the SECURITY DEFINER function calls.
**Why it happens:** Default `search_path` includes `public`, `pg_catalog`; a shadow function in `public` with the same name as a `pg_catalog` function gets called.
**How to avoid:** Always add `set search_path = ''` and use fully qualified names (`public.table`, `pg_catalog.func`).
**Warning signs:** Supabase security linter flags "security definer view without search_path".

### Pitfall 6: Attempting to Set Cookies in Server Components
**What goes wrong:** Server Component calls `cookieStore.set()` — throws error because Server Components are read-only during rendering.
**Why it happens:** Session refresh must happen in middleware or Route Handlers, not in Server Components.
**How to avoid:** The `createServerClient` in `lib/supabase/server.ts` wraps `setAll` in a `try/catch` — this is intentional. Token refresh happens in middleware, which runs before the Server Component renders.
**Warning signs:** `TypeError: Cookies can only be modified in a Server Action or Route Handler`.

### Pitfall 7: Email OTP as MFA Factor Not Supported Natively
**What goes wrong:** Developer calls `supabase.auth.mfa.enroll({ factorType: 'email' })` — this does not work; Supabase only supports `'totp'` and `'phone'` as second factors.
**Why it happens:** Supabase documentation mentions "email-based verification" in the general MFA overview but this refers to email OTP as the *primary* sign-in method, not as a second factor.
**How to avoid:** Implement email OTP as a custom secondary challenge: generate a 6-digit code, hash it, store in `mfa_otp_challenges` table with 10-minute TTL, send via Resend, verify on submission. See `mfa_otp_challenges` table in schema above.
**Warning signs:** GitHub discussion #29082 confirms this is still a feature request as of May 2026.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 → stable 2024 | auth-helpers is deprecated; ssr is official replacement |
| `getSession()` server-side | `getUser()` server-side | 2024 (security fix) | getSession() does not validate JWT; getUser() does |
| `anon` API key | Publishable key (`sb_publishable_xxx`) | June 2025 (opt-in), late 2026 (required) | New projects use publishable key; existing anon key functional until late 2026 |
| `supabase.auth.signInWithPassword()` then check user | signInWithPassword() then check `getUser()` | 2024 | Same pattern; emphasize always re-validating with getUser() |
| Password-in-URL auth callbacks | PKCE flow with `exchangeCodeForSession` | 2023+ | PKCE required for App Router; tokens never in URL |
| Jest | Vitest | 2025 (official Next.js docs) | Jest deprecated for new Next.js projects |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: superseded by `@supabase/ssr` — do not install
- `supabase.auth.session()`: removed in v2 — use `getUser()` or `getSession()`
- Environment variable `NEXT_PUBLIC_SUPABASE_ANON_KEY`: still functional until late 2026; new projects may use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zod v4 is compatible with the project; CLAUDE.md note about "v3 only" was written before Zod v4 stable release | Standard Stack | Minor: may need to pin `zod@3` and rollback if v4 has incompatibilities with @hookform/resolvers |
| A2 | 30-day device trust uses HMAC-signed cookie + DB lookup — no official Supabase pattern exists for this | Pattern 9, Schema (mfa_device_trust) | Medium: implementation is correct in principle but exact validation strategy (cookie-only vs cookie + DB) may need UX discussion |
| A3 | Email OTP MFA implemented as custom `mfa_otp_challenges` table + Resend delivery | Schema, Pitfall 7 | High: user's locked decision specified "TOTP + email OTP, user chooses" — must surface this as a deviation to confirm |
| A4 | Backup recovery codes stored as bcrypt hashes in custom `mfa_backup_codes` table | Schema, Pattern 10 | Low: industry standard; only risk is bcrypt rounds selection (12 recommended) |
| A5 | `auth.users` can be seeded with `crypt()` from pgcrypto in Supabase seed.sql | Pattern 11 | Low: community-verified pattern, but Supabase may restrict direct auth.users inserts in future versions |
| A6 | `user_profiles.active_role` stored in JWT via hook and used for RLS — role switch invalidates JWT via refreshSession() | Schema, Pattern 4, Pitfall 3 | Medium: if JWT refresh isn't triggered on role switch, users may temporarily see wrong data |
| A7 | Publishable key (`sb_publishable_*`) is optional until late 2026; using `NEXT_PUBLIC_SUPABASE_ANON_KEY` is fine for now | Standard Stack | Low: anon key remains functional; migrate to publishable key before late 2026 |

---

## Open Questions

1. **Email OTP MFA — Custom vs Deferred**
   - What we know: Supabase does not support `factorType: 'email'` as of May 2026. Feature request #29082 is unanswered.
   - What's unclear: Does the project want to implement a custom email OTP flow (Resend + `mfa_otp_challenges` table + 10-min TTL), or simplify to TOTP-only for Phase 1 and defer email OTP?
   - Recommendation: Implement TOTP as primary MFA. Add `mfa_otp_challenges` table to support a custom email OTP flow, but present this to user as "custom implementation (not native Supabase)" and confirm before building.

2. **Zod v3 vs v4**
   - What we know: CLAUDE.md research notes say "Zod v3.x (not v4 yet)"; current npm latest is 4.4.3. @hookform/resolvers 5.4.0 supports Zod v4.
   - What's unclear: Was the CLAUDE.md restriction a temporary caution (now outdated) or a deliberate pin?
   - Recommendation: Use Zod v4 unless the project explicitly pins v3. No breaking changes affect the patterns in this phase.

3. **Role Switching — JWT Refresh Strategy**
   - What we know: JWT claims are baked at issuance; `custom_access_token_hook` fires on refresh. After user selects role at login screen, `active_role` needs to be set and JWT refreshed.
   - What's unclear: Exact flow — does the role selection screen call `supabase.auth.updateUser({ data: { active_role } })` then `refreshSession()`, or is there a Server Action pattern?
   - Recommendation: Role selection screen calls a Server Action that (1) UPDATEs `user_profiles.active_role`, (2) calls `supabase.auth.admin.updateUserById()` to set `app_metadata.active_role`, then (3) refreshes the session via `supabase.auth.refreshSession()`. Needs the Service Role key for admin API — keep server-side only.

4. **Password Policy — Supabase Dashboard vs Application Layer**
   - What we know: Supabase dashboard can enforce minimum length and character classes; the plan requires 12+ chars, 1 uppercase, 1 number, 1 symbol. Supabase supports these settings.
   - What's unclear: Should the Zod schema on the form enforce the same rule (double validation) or rely solely on Supabase?
   - Recommendation: Enforce in both Zod schema (client feedback) AND Supabase Auth settings (server enforcement). Defense-in-depth.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + development | Yes | v24.14.1 | — |
| npm | Package management | Yes | 11.11.0 | — |
| Supabase CLI | Migrations, seed, type-gen | Not checked | — | Install: `npm i -g supabase` |
| Supabase project (cloud) | Auth, DB, RLS | Not checked | — | `supabase start` for local dev |
| RESEND_API_KEY env var | Email notifications | Not set (new project) | — | Set in `.env.local` after Resend signup |
| DEVICE_TRUST_SECRET env var | 30-day device trust HMAC | Not set | — | Generate: `openssl rand -hex 32` |

**Missing dependencies with no fallback:**
- Supabase project credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — required to run any auth code; must be created on supabase.com before Wave 1

**Missing dependencies with fallback:**
- Resend API key — email notifications degrade gracefully; auth still works without it

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (project standard, per CLAUDE.md research) |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Registration creates pending user | Integration (Playwright) | `playwright test auth/register.spec.ts` | Wave 0 gap |
| AUTH-02 | Session persists across page reload | E2E (Playwright) | `playwright test auth/session.spec.ts` | Wave 0 gap |
| AUTH-03 | Logout clears session and redirects | E2E (Playwright) | `playwright test auth/logout.spec.ts` | Wave 0 gap |
| AUTH-04 | Role assignment stores in user_roles table | Unit + Integration | `vitest run tests/auth/roles.test.ts` | Wave 0 gap |
| AUTH-05 | RLS blocks cross-institution data access | Integration (Playwright) | `playwright test auth/rls.spec.ts` | Wave 0 gap |
| AUTH-06 | institution_id scopes all queries | Integration | `vitest run tests/rls/institution.test.ts` | Wave 0 gap |
| AUTH-07 | MFA enrollment generates QR + factor | Unit | `vitest run tests/auth/mfa.test.ts` | Wave 0 gap |
| AUTH-07 | Device trust cookie set after MFA | Integration | `playwright test auth/device-trust.spec.ts` | Wave 0 gap |
| AUTH-07 | Backup codes generated as 8 hashed codes | Unit | `vitest run tests/auth/recovery-codes.test.ts` | Wave 0 gap |
| AUTH-08 | Login creates audit_event row | Integration | `vitest run tests/audit/auth-events.test.ts` | Wave 0 gap |
| TRAIL-01 | INSERT on governance table creates audit row | Integration | `vitest run tests/audit/trigger.test.ts` | Wave 0 gap |
| TRAIL-02 | UPDATE on audit_events throws exception | Integration | `vitest run tests/audit/immutable.test.ts` | Wave 0 gap |
| TRAIL-03 | Trigger fires even if app code skips audit | Integration | included in trigger.test.ts | Wave 0 gap |
| TRAIL-04 | SHA-256 checksum matches stored value | Unit | `vitest run tests/files/checksum.test.ts` | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=dot` (unit tests only, < 10s)
- **Per wave merge:** `npx vitest run && npx playwright test --project=chromium`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — framework setup
- [ ] `playwright.config.ts` — e2e setup
- [ ] `tests/setup.ts` — shared Supabase test client + seed helpers
- [ ] `tests/auth/` directory — all auth test files
- [ ] `tests/audit/` directory — all audit test files
- [ ] Install: `npm install -D vitest @vitejs/plugin-react playwright @playwright/test`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (email/password, bcrypt, JWT) |
| V3 Session Management | Yes | @supabase/ssr httpOnly cookie; 1h access token; refresh token rotation |
| V4 Access Control | Yes | Supabase RLS + middleware role check + JWT claims |
| V5 Input Validation | Yes | Zod schema on all form inputs; Supabase dashboard password policy |
| V6 Cryptography | Yes | bcryptjs for backup codes; HMAC-SHA256 for device trust; pgcrypto for seed |
| V7 Error Handling | Yes | Never expose internal errors to client; Pino structured logging server-side |
| V13 API Security | Yes | Route Handlers return minimum data; Service Role key never exposed to client |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT forgery | Spoofing | Use `getUser()` not `getSession()` in server context; JWT validated against Supabase public keys |
| RLS bypass via app code | Elevation of Privilege | RLS enforced at Postgres layer; app code cannot bypass |
| Audit log tampering | Tampering | REVOKE + RESTRICTIVE RLS + RAISE EXCEPTION trigger on audit_events |
| TOTP replay attack | Spoofing | Supabase TOTP includes 30-second window + one-interval clock skew; each code single-use |
| Cross-institution data leak | Information Disclosure | `institution_id` in every RLS policy; JWT claims in `app_metadata` (not user_metadata) |
| Weak passwords | Spoofing | 12+ chars enforced in Supabase Auth dashboard settings + Zod schema |
| Credential stuffing | Spoofing | Supabase built-in rate limiting; HaveIBeenPwned integration (Pro tier) |
| Session fixation | Spoofing | @supabase/ssr regenerates session cookie on sign-in |
| Seed credentials in production | Information Disclosure | Change seed password immediately; use env-specific seed scripts |

---

## Sources

### Primary (HIGH confidence)
- [Supabase SSR Client Docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — createServerClient, createBrowserClient, middleware pattern
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — JWT claims injection SQL
- [Supabase RBAC Custom Claims](https://supabase.com/docs/guides/auth/custom-claims-and-role-based-access-control-rbac) — hook function + authorize() pattern
- [Supabase RLS Performance Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — SELECT wrapper, TO authenticated, indexes
- [Supabase TOTP MFA Guide](https://supabase.com/docs/guides/auth/auth-mfa/totp) — mfa.enroll/challenge/verify API
- [Supabase Auth MFA Overview](https://supabase.com/docs/guides/auth/auth-mfa) — AAL levels, enrollment flow
- [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security) — dashboard configuration, character requirements
- [Supabase Session Management](https://supabase.com/docs/guides/auth/sessions) — session lifetime, cookie config
- [Resend Next.js Docs](https://resend.com/docs/send-with-nextjs) — send API, route handler pattern
- [Supabase DB Seeding](https://supabase.com/docs/guides/local-development/seeding-your-database) — seed.sql pattern
- npm registry — @supabase/ssr@0.10.3, @supabase/supabase-js@2.106.1, resend@6.12.3, zod@4.4.3 (verified 2026-05-22)

### Secondary (MEDIUM confidence)
- [laros.io — Seeding users with SQL](https://laros.io/seeding-users-in-supabase-with-a-sql-seed-script) — auth.users + auth.identities seed pattern (corroborated by Supabase GitHub discussions)
- [Supabase Postgres Audit Blog](https://supabase.com/blog/postgres-audit) — SECURITY DEFINER trigger, to_jsonb() pattern
- [bluelabellabs.com — Postgres Audit Logging](https://www.bluelabellabs.com/blog/how-to-setup-automatic-audit-logging-in-postgres-using-triggers-and-trigger-functions/) — trigger function structure, excluded columns pattern
- [Supabase API Keys Migration](https://supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys) — publishable key timeline

### Tertiary (LOW confidence / needs validation)
- [GitHub Discussion #29082 — Email MFA](https://github.com/orgs/supabase/discussions/29082) — email OTP as second factor is unimplemented (single source, but confirmed by absence in official docs)
- Device trust cookie pattern (30-day HMAC) — [ASSUMED] standard security pattern; no official Supabase reference exists for this specific implementation
- Custom backup recovery codes (bcryptjs) — [ASSUMED] industry standard; no official Supabase reference; confirmed Supabase itself does not provide this

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all versions verified against npm registry 2026-05-22
- @supabase/ssr patterns: HIGH — verified via official Supabase docs
- Custom JWT hook: HIGH — verified via official Supabase Auth Hooks docs
- RLS patterns: HIGH — verified via official Supabase RLS docs
- Audit trigger SQL: MEDIUM-HIGH — corroborated by Supabase blog + 2 community guides; exact field exclusion syntax (`to_jsonb(NEW) - array[...]`) is standard Postgres
- MFA TOTP flow: HIGH — verified via official Supabase TOTP guide
- Email OTP MFA (custom): MEDIUM — gap confirmed; custom implementation is [ASSUMED] standard
- Backup recovery codes: MEDIUM — gap confirmed; bcrypt pattern is [ASSUMED] industry standard
- Device trust cookie: LOW-MEDIUM — pattern is [ASSUMED]; no official reference found
- Seed migration: MEDIUM — verified against community sources + Supabase discussions

**Research date:** 2026-05-22
**Valid until:** 2026-08-22 (90 days — Supabase API changes infrequently; MFA features may evolve sooner)
