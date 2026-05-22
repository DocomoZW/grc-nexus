# Phase 1 Plan: Foundation — Authentication, RLS, and Audit Trail

**Phase:** 01-foundation-authentication-rls-and-audit-trail
**Created:** 2026-05-22
**Requirements covered:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, TRAIL-01, TRAIL-02, TRAIL-03, TRAIL-04

---

## Phase Goal

Deliver a fully functional authentication and security foundation:

- Users can register (status: pending), be approved by an admin, log in, select their active role, and access `/dashboard`
- MFA enforced for `admin` and `board-member` roles: TOTP (primary via Supabase) + custom email OTP via Resend (secondary, stored in `mfa_otp_challenges`); 30-day device trust; 8 bcrypt-hashed backup codes
- All governance tables have Supabase RLS with institution-scoped isolation via JWT `app_metadata` claims
- Immutable audit trail: Postgres `SECURITY DEFINER` triggers on all governance tables + three-layer write-protection on `audit_events`
- Seed migration creates demo institution + superadmin account (`admin@grcnexus.gov.zw` / `Admin@GRC2026!`)

---

## Source Audit

| Source | Item | Plan task |
|--------|------|-----------|
| GOAL | Users register → pending → admin-approved → login → role select → dashboard | T-03, T-04, T-07, T-08, T-09 |
| GOAL | MFA: TOTP + email OTP; 30-day device trust; 8 backup codes | T-10, T-11, T-12, T-13 |
| GOAL | RLS on all governance tables (institution-scoped) | T-05, T-06 |
| GOAL | Immutable audit trail via Postgres triggers | T-05, T-06 |
| GOAL | Seed: demo institution + superadmin | T-06 |
| AUTH-01 | Email/password registration → pending status | T-07, T-08 |
| AUTH-02 | Persistent sessions via server-side cookies | T-03, T-04 |
| AUTH-03 | Logout from any page | T-09 |
| AUTH-04 | Roles: admin, board-member, ceo, risk-officer, audit-officer, dept-head | T-01, T-05 |
| AUTH-05 | Supabase RLS on all tables | T-05 |
| AUTH-06 | Institution-scoped data isolation | T-05 |
| AUTH-07 | MFA: TOTP + email OTP; 30-day trust; 8 backup codes | T-10, T-11, T-12, T-13 |
| AUTH-08 | Immutable audit event for login/logout/permission change | T-05, T-09 |
| TRAIL-01 | Trigger on every governance table mutation | T-05 |
| TRAIL-02 | audit_events append-only (no UPDATE/DELETE) | T-06 |
| TRAIL-03 | Audit at Postgres trigger layer (SECURITY DEFINER) | T-05 |
| TRAIL-04 | SHA-256 checksum verification on download | T-15 |
| CONTEXT D-01 | Minimal focused login form (institution logo, email, password) | T-07 |
| CONTEXT D-02 | Post-login always redirects to /dashboard | T-09 |
| CONTEXT D-03 | Sessions always persistent (no "remember me") | T-03 |
| CONTEXT D-04 | Strong password policy (12+ chars, uppercase, number, symbol) | T-02, T-07 |
| CONTEXT D-05 | Self-registration → pending until admin approves + assigns role | T-08, T-14 |
| CONTEXT D-06 | Role switching at login — user selects active role from assigned set | T-09 |
| CONTEXT D-07 | Seed: demo institution + superadmin via migration | T-06 |
| CONTEXT D-08 | Email notification on role assignment (Resend) | T-14 |
| CONTEXT D-09 | Both MFA methods available; user chooses at setup | T-10, T-11 |
| CONTEXT D-10 | 30-day device trust after MFA | T-12 |
| CONTEXT D-11 | 8 backup recovery codes, shown once, downloadable | T-13 |
| CONTEXT D-12 | Audit scope: all governance tables; full JSONB diff | T-05 |
| CONTEXT D-13 | audit_events INSERT-only at any permission level | T-06 |
| CONTEXT D-14 | Sensitive field exclusion (passwords, tokens) in audit JSONB | T-05 |
| RESEARCH | getUser() not getSession() everywhere server-side | T-03, T-04 |
| RESEARCH | Double auth check: middleware + layout | T-03, T-04 |
| RESEARCH | custom_access_token_hook injects institution_id, roles, active_role into JWT | T-05 |
| RESEARCH | force-dynamic export on all authenticated routes | T-04 |
| RESEARCH | Service Role key server-side only | T-02, T-14 |
| UI-SPEC | 8 screens: Login, Role Select, Register, Pending, Admin Users, MFA Setup, MFA Challenge, Audit Log | T-07 through T-16 |
| UI-SPEC | Tailwind custom tokens, shadcn/ui component library | T-02 |

All 12 requirements and all locked CONTEXT decisions are covered. No deferred ideas (OAuth, SAML, IP allowlisting) appear in any task.

---

## Milestones

| Milestone | Tasks | Description |
|-----------|-------|-------------|
| M0: Project Scaffold | T-01, T-02 | Next.js 14 init, dependencies, Tailwind tokens, shadcn, env vars |
| M1: Database Foundation | T-03, T-04, T-05, T-06 | Supabase clients, middleware, all 6 migrations pushed, types generated |
| M2: Auth Flow | T-07, T-08, T-09 | Login, register, pending page, role-select, dashboard, logout |
| M3: MFA System | T-10, T-11, T-12, T-13 | TOTP setup, email OTP, backup codes, device trust |
| M4: Admin + Audit UI | T-14, T-15, T-16 | User management, role assignment, audit log viewer |

---

## Task List

---

### M0: Project Scaffold

---

#### T-01 — Initialize Next.js 14 project with TypeScript [BLOCKING]

**Requires:** Node.js v24.14.1, npm 11.11.0
**Creates:** Project root, `package.json`, `tsconfig.json`, `.env.local`, `next.config.ts`

**Files created/modified:**
- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `.env.local` (from `.env.local.example`)
- `.env.local.example`
- `.gitignore`

**Action:**

Run in the project root (`C:\Users\Kuziwa\Desktop\Lab\grc-nexus`):

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

After scaffold:

1. Install all runtime and dev dependencies in one command:

```bash
npm install @supabase/supabase-js@2.106.1 @supabase/ssr@0.10.3 resend@6.12.3 react-email@6.3.1 @react-email/components bcryptjs zod@3.24.3 react-hook-form@7.76.0 @hookform/resolvers@3.10.0 @tanstack/react-query qrcode.react zustand sonner

npm install -D @types/bcryptjs vitest @vitejs/plugin-react playwright @playwright/test
```

2. Create `.env.local.example` with all required variables:

```
# Supabase (required — create project at supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase service role (server-side ONLY — never NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend (transactional email)
RESEND_API_KEY=re_xxxx

# Device trust HMAC secret — generate with: openssl rand -hex 32
DEVICE_TRUST_SECRET=your-32-byte-hex-secret
```

3. Copy `.env.local.example` to `.env.local` and note that it must be filled before any auth code runs.

4. Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
```

5. Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
```

6. Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

7. Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
// Shared test helpers and Supabase test client setup
// Full implementation in T-02
```

**Accept criteria:**
- `npm run dev` starts without errors
- `npx vitest run` runs (may have 0 tests — that is expected at this step)
- `.env.local.example` committed, `.env.local` in `.gitignore`

**Verify:** `npm run build` exits 0; `.env.local` is listed in `.gitignore`

---

#### T-02 — Configure Tailwind, shadcn/ui, and TypeScript types [BLOCKING]

**Requires:** T-01 complete
**Creates:** Design system foundation, all shadcn components needed for Phase 1, shared TypeScript types

**Files created/modified:**
- `tailwind.config.ts`
- `app/globals.css`
- `components/ui/` (shadcn components — auto-generated)
- `types/auth.ts`
- `tests/setup.ts` (complete)

**Action:**

1. Initialize shadcn/ui with slate base:

```bash
npx shadcn@latest init
```

When prompted: style=`default`, base color=`slate`, CSS variables=`yes`.

2. Install all shadcn components needed for Phase 1 in one command:

```bash
npx shadcn@latest add button input form card badge alert select table dialog checkbox avatar pagination sonner
```

3. Replace `tailwind.config.ts` extend section with the exact GRC-Nexus design tokens:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'navy-950': '#050D1B',
        'navy-900': '#0B1625',
        'navy-mid': '#3A5270',
        'paper': '#F3F7FD',
        'paper-border': '#D7E2EF',
        'gold': '#C8A44A',
        'gold-hi': '#DDB96A',
        'gold-pale': '#F3E2BC',
        'ok': '#27AE60',
        'warn': '#E67E22',
        'err': '#E74C3C',
      },
      fontFamily: {
        heading: ['var(--font-playfair)', 'serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(5,13,27,0.08)',
        'auth': '0 8px 32px rgba(5,13,27,0.14)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

4. Update `app/globals.css` to load Google Fonts (Playfair Display, DM Sans, DM Mono) and set CSS custom properties matching the color tokens.

5. Create `types/auth.ts` with the full AppRole type, UserStatus, InstitutionType, AppMetadata interface, ROLE_DESCRIPTIONS constant, and MFA_REQUIRED_ROLES array exactly as specified in PATTERNS.md `### types/auth.ts` section. Key contents:

```typescript
export type AppRole =
  | 'admin'
  | 'board-member'
  | 'ceo'
  | 'risk-officer'
  | 'audit-officer'
  | 'dept-head'

export type UserStatus = 'pending' | 'approved' | 'suspended'

export type InstitutionType = 'ministry' | 'department' | 'agency' | 'soe'

export interface AppMetadata {
  institution_id: string
  dept_id: string
  active_role: AppRole | ''
  roles: AppRole[]
  status: UserStatus
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  'admin': 'Full administrative access and user management',
  'board-member': 'Board governance, meetings, and resolutions',
  'ceo': 'Executive oversight and strategic performance',
  'risk-officer': 'Risk register and treatment management',
  'audit-officer': 'Audit findings and compliance review',
  'dept-head': 'Departmental performance and compliance',
}

export const MFA_REQUIRED_ROLES: AppRole[] = ['admin', 'board-member']
```

6. Complete `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
import { afterAll, beforeAll } from 'vitest'

// Suppress Next.js server-only module warnings in test env
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.DEVICE_TRUST_SECRET = 'a'.repeat(64)
process.env.RESEND_API_KEY = 're_test'

beforeAll(() => {
  // Global test setup
})

afterAll(() => {
  // Global teardown
})
```

**Accept criteria:**
- `npx shadcn@latest add --help` works without error
- All listed shadcn component files exist under `components/ui/`
- `types/auth.ts` exports AppRole, MFA_REQUIRED_ROLES, ROLE_DESCRIPTIONS
- `npx vitest run` runs 0 tests with 0 failures (framework ready)

**Verify:** `npm run build` exits 0; `ls components/ui/` shows button.tsx, input.tsx, form.tsx, card.tsx, badge.tsx, alert.tsx, select.tsx, table.tsx, dialog.tsx, checkbox.tsx, avatar.tsx, pagination.tsx, sonner.tsx

---

### M1: Database Foundation

---

#### T-03 — Supabase client setup + middleware [BLOCKING] [SECURITY]

**Requires:** T-01, T-02 complete; `.env.local` filled with Supabase project credentials
**Creates:** All Supabase client files + the request-response middleware with MFA gate

**Files created/modified:**
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/admin.ts`
- `middleware.ts`

**Action:**

1. Create `lib/supabase/server.ts` — copy the exact implementation from PATTERNS.md `### lib/supabase/server.ts`. Critical rule: `setAll` is wrapped in `try/catch` intentionally — Server Components cannot set cookies; middleware handles token refresh.

2. Create `lib/supabase/client.ts` — copy the exact implementation from PATTERNS.md `### lib/supabase/client.ts`. This file is exclusively for `'use client'` components.

3. Create `lib/supabase/admin.ts` — Service Role client for admin operations (role assignment, user approval). This key is NEVER used in any client component or passed to the browser:

```typescript
// lib/supabase/admin.ts
// SERVER-SIDE ONLY. Never import in client components.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // NO NEXT_PUBLIC_ prefix — server only
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

4. Create `middleware.ts` — copy the exact implementation from PATTERNS.md `### middleware.ts`. Critical points:
   - ALWAYS calls `supabase.auth.getUser()` (not `getSession()`) — this refreshes the token
   - Public routes: `['/login', '/register', '/auth/confirm', '/auth/callback', '/register/pending']`
   - MFA gate checks: active_role in MFA_REQUIRED_ROLES → device trust cookie absent → AAL level not `aal2` → redirect to `/mfa/challenge`
   - MFA and role-select paths are exempt from the MFA redirect to avoid loops
   - Matcher config excludes static assets and images

[SECURITY] Anti-patterns to avoid — both will be flagged in code review:
- `supabase.auth.getSession()` anywhere in this file — use `getUser()` only
- Reading `SUPABASE_SERVICE_ROLE_KEY` in middleware (anon key only; Service Role key only in Server Actions and Route Handlers)

**Accept criteria:**
- `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/admin.ts` all export their respective `createClient()`/`createAdminClient()` functions
- `middleware.ts` exports `middleware` function and `config` object with matcher
- `grep -rn "getSession" middleware.ts` returns no matches (getUser only)
- `grep -rn "SUPABASE_SERVICE_ROLE_KEY" middleware.ts` returns no matches (not in middleware)

**Verify:** `npm run build` exits 0

---

#### T-04 — Zod schemas, TypeScript interfaces, and auth layouts [BLOCKING]

**Requires:** T-02 complete
**Creates:** All Zod validation schemas, generated Supabase types placeholder, and both route group layouts

**Files created/modified:**
- `lib/schemas/auth.ts`
- `lib/schemas/audit.ts`
- `types/supabase.ts` (placeholder — replaced by `supabase gen types typescript` after T-05)
- `app/(auth)/layout.tsx`
- `app/(protected)/layout.tsx` [SECURITY] — double auth check

**Action:**

1. Create `lib/schemas/auth.ts` — copy the exact implementation from PATTERNS.md `### lib/schemas/auth.ts`. Key schemas: `loginSchema`, `registerSchema`, `mfaCodeSchema`, `backupCodeSchema`, plus exported inferred types. Password policy: 12+ chars, 1 uppercase, 1 number, 1 symbol — all enforced in a single user-facing error message per UI-SPEC copywriting contract.

2. Create `lib/schemas/audit.ts` — filters for the audit log viewer:

```typescript
import { z } from 'zod'

export const auditFilterSchema = z.object({
  actorSearch: z.string().optional(),
  action: z.enum(['INSERT', 'UPDATE', 'DELETE', '']).optional(),
  tableName: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(25),
})

export type AuditFilterInput = z.infer<typeof auditFilterSchema>
```

3. Create `types/supabase.ts` as a minimal placeholder that the codebase can import from before the real generated types arrive in T-05:

```typescript
// types/supabase.ts
// PLACEHOLDER — replaced by `supabase gen types typescript --local > types/supabase.ts` after migration push
// Provides minimal Database type structure so imports don't break before T-05.
export type Database = {
  public: {
    Tables: Record<string, unknown>
    Views: Record<string, unknown>
    Functions: Record<string, unknown>
    Enums: Record<string, unknown>
  }
}
```

4. Create `app/(auth)/layout.tsx` — copy the exact implementation from PATTERNS.md `### app/(auth)/layout.tsx`. No auth check; provides the `min-h-screen bg-paper flex items-center justify-center` shell.

5. Create `app/(protected)/layout.tsx` — copy the exact implementation from PATTERNS.md `### app/(protected)/layout.tsx`. This layout is the second auth check (defense-in-depth after middleware). Key behaviors:
   - Calls `supabase.auth.getUser()` — NOT `getSession()`
   - `pending` status → redirect `/register/pending`
   - No user → redirect `/login`
   - Add `export const dynamic = 'force-dynamic'` at the top — [SECURITY] prevents ISR cache from serving stale Set-Cookie headers

[SECURITY] Every authenticated layout and page must export:
```typescript
export const dynamic = 'force-dynamic'
```
This prevents Next.js ISR from caching responses that include `Set-Cookie` auth headers and serving stale sessions to other users.

**Accept criteria:**
- `lib/schemas/auth.ts` exports loginSchema, registerSchema, mfaCodeSchema, backupCodeSchema, and their inferred types
- `app/(auth)/layout.tsx` renders children with paper background, no auth check
- `app/(protected)/layout.tsx` calls `getUser()` and redirects unauthenticated/pending users
- `grep -n "force-dynamic" app/(protected)/layout.tsx` returns a match

**Verify:** `npx vitest run tests/auth/schemas.test.ts` (create minimal test: password shorter than 12 chars fails, valid password passes)

---

#### T-05 — Database migrations: schema + RLS + audit triggers + JWT hook [BLOCKING] [SECURITY]

**Requires:** T-03 complete; Supabase project credentials set in `.env.local`; Supabase CLI installed (`npm i -g supabase`)
**Creates:** All 5 migration SQL files; `supabase db push` deploys to linked project; `supabase gen types` regenerates `types/supabase.ts`

**Files created/modified:**
- `supabase/migrations/20260522000001_base_schema.sql`
- `supabase/migrations/20260522000002_rls_policies.sql`
- `supabase/migrations/20260522000003_audit_triggers.sql`
- `supabase/migrations/20260522000004_audit_immutability.sql`
- `supabase/migrations/20260522000005_custom_access_token_hook.sql`
- `types/supabase.ts` (overwritten with generated types)

**Action:**

**Step 1 — Create `supabase/migrations/20260522000001_base_schema.sql`**

Copy the complete SQL from RESEARCH.md `## Schema Design — All Phase 1 Tables`. Ensure ALL of the following tables are present with their exact column definitions and indexes:

- `pgcrypto` and `uuid-ossp` extensions
- Enums: `app_role` (6 values), `user_status` ('pending', 'approved', 'suspended'), `institution_type` (4 values), `audit_action` (INSERT/UPDATE/DELETE/AUTH) — 'AUTH' covers login, logout, and permission-change application events that aren't data mutations
- `public.institutions` + `idx_institutions_type`
- `public.user_profiles` (with `active_role app_role` column for JWT hook) + 2 indexes
- `public.user_roles` (bigint identity PK, unique on user_id+institution_id+role_name) + 2 indexes
- `public.mfa_device_trust` (token_hash text, expires_at) + 2 indexes
- `public.mfa_backup_codes` (code_hash text, used_at nullable) + 1 index
- `public.mfa_otp_challenges` (code_hash text, expires_at, used_at nullable) + 1 index
- `public.audit_events` (bigint identity PK, actor_id, action audit_action, table_name, record_id text, before_state jsonb, after_state jsonb, occurred_at, event_type text, metadata jsonb) + 5 indexes including composite

**Step 2 — Create `supabase/migrations/20260522000002_rls_policies.sql`** [SECURITY]

Copy Pattern 5 from RESEARCH.md exactly. Contents:

1. `auth.institution_id()` helper function — `SECURITY DEFINER set search_path = ''`
2. `auth.active_role()` helper function — `SECURITY DEFINER set search_path = ''`
3. Enable and force RLS on every Phase 1 governance table:
   ```sql
   alter table public.institutions enable row level security;
   alter table public.institutions force row level security;
   alter table public.user_profiles enable row level security;
   -- repeat for user_roles, mfa_device_trust, mfa_backup_codes, mfa_otp_challenges
   ```
4. RLS policies on each table using `(select auth.institution_id())` — always with `TO authenticated` qualifier. [SECURITY] Use `SELECT` wrapper to cache per statement, not per row.
5. For `user_profiles`: SELECT policy allows `id = auth.uid()` (users can see their own profile) OR `institution_id = (select auth.institution_id())` (users in same institution can see colleagues' profiles — needed for admin UI)
6. For `user_roles`: SELECT allows own user or same institution; INSERT/UPDATE restricted to admin role
7. For `mfa_*` tables: SELECT/INSERT/UPDATE restricted to `auth.uid() = user_id` only (private MFA data)
8. Create performance index on `institution_id` for every governance table that has it

**Step 3 — Create `supabase/migrations/20260522000003_audit_triggers.sql`** [SECURITY]

Copy Patterns 6 from RESEARCH.md exactly. Contents:

1. Create `audit` schema: `CREATE SCHEMA IF NOT EXISTS audit;`
2. Create `audit.create_audit_event()` trigger function — `SECURITY DEFINER set search_path = ''`
   - Gets `v_actor_id` from `(auth.jwt()->>'sub')::uuid` with exception handler fallback to null
   - `v_excluded_fields` array: `array['password', 'encrypted_password', 'hashed_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'reauthentication_token']`
   - Applies `(to_jsonb(OLD) - v_excluded_fields)` exclusion on before_state [SECURITY]
   - Applies `(to_jsonb(NEW) - v_excluded_fields)` exclusion on after_state [SECURITY]
   - Inserts into `public.audit_events`
3. Create `audit.attach_audit_trigger(p_table_name text)` helper
4. Call `select audit.attach_audit_trigger('institutions')` and `select audit.attach_audit_trigger('user_profiles')` and `select audit.attach_audit_trigger('user_roles')` for Phase 1 tables (future phases add their own calls)
5. Grant `insert on public.audit_events to postgres` (trigger runs as postgres via SECURITY DEFINER)

**Step 4 — Create `supabase/migrations/20260522000004_audit_immutability.sql`** [SECURITY]

Copy Pattern 7 from RESEARCH.md exactly. Three-layer protection:

Layer 1 — REVOKE:
```sql
revoke update, delete, truncate on public.audit_events from authenticated;
revoke update, delete, truncate on public.audit_events from anon;
```

Layer 2 — RLS on audit_events:
```sql
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

create policy "audit_select" on public.audit_events
  for select to authenticated
  using ((select auth.active_role()) in ('admin', 'audit-officer'));
-- No UPDATE or DELETE policy = implicitly denied
```

Layer 3 — RAISE EXCEPTION trigger:
```sql
create or replace function audit.prevent_audit_modification()
  returns trigger language plpgsql security definer set search_path = ''
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
```

**Step 5 — Create `supabase/migrations/20260522000005_custom_access_token_hook.sql`**

Copy Pattern 4 from RESEARCH.md exactly. The function reads from `public.user_profiles` and `public.user_roles` and injects `institution_id`, `dept_id`, `active_role`, `roles`, `status` into `app_metadata`. Must include `set search_path = ''`. Must GRANT execute to `supabase_auth_admin` and REVOKE from `authenticated`, `anon`, `public`.

**Step 6 — Deploy and generate types (BLOCKING — must succeed before T-06)**

```bash
# Link to your Supabase project (one-time)
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
npx supabase db push

# Regenerate TypeScript types from live schema
npx supabase gen types typescript --linked > types/supabase.ts
```

**Step 7 — After DB push: enable the custom access token hook in Supabase Dashboard**

In the Supabase Dashboard: Authentication → Hooks → "Customize access token (JWT) claims" → select function `public.custom_access_token_hook`. This step is manual — the dashboard UI is the only way to activate hooks; no SQL command exists for it.

**Step 8 — Verify each migration deployed correctly:**

```sql
-- Run in Supabase SQL editor or psql:
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected: audit_events, institutions, mfa_backup_codes, mfa_device_trust, mfa_otp_challenges, user_profiles, user_roles

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check audit trigger attached
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_name = 'audit_trigger';
```

[SECURITY] Verify all SECURITY DEFINER functions have `set search_path = ''`:
```sql
SELECT p.proname, p.prosecdef, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'audit', 'auth')
AND p.prosecdef = true;
-- All rows should have proconfig containing 'search_path='
```

**Accept criteria:**
- `supabase db push` exits 0 with no migration errors
- `types/supabase.ts` contains real generated types (not the placeholder)
- All 7 Phase 1 tables exist in the Supabase project
- RLS is enabled on all 7 tables
- Audit trigger fires on `institutions` and `user_profiles` (verified in Step 8)
- Attempting `UPDATE public.audit_events SET actor_id = null WHERE false` raises `insufficient_privilege` exception

**Verify:**
```bash
# After db push:
npx supabase db diff --use-migra  # should show empty diff (all migrations applied)
```

---

#### T-06 — Seed migration: demo institution + superadmin [BLOCKING]

**Requires:** T-05 complete (schema deployed, types generated)
**Creates:** `supabase/seed.sql` and `supabase/migrations/20260522000006_seed.sql`

Note: Supabase provides two seeding mechanisms — `supabase/seed.sql` (run by `supabase db reset`) and a numbered migration for persistent seed data. Use the numbered migration so the seed runs on `supabase db push` in CI/staging.

**Files created/modified:**
- `supabase/migrations/20260522000006_seed.sql`
- `supabase/seed.sql` (copy of migration, for local `supabase db reset` convenience)

**Action:**

Create `supabase/migrations/20260522000006_seed.sql` by copying Pattern 11 from RESEARCH.md exactly, with the following additions and corrections:

1. Ensure `pgcrypto` extension is referenced (already in migration 1, so just `DO $$`).

2. Use these exact deterministic IDs:
   - `v_admin_id := '00000000-0000-0000-0000-000000000001'`
   - `v_inst_id := '00000000-0000-0000-0000-000000000010'`

3. Demo institution record — use `institution_type` enum (not a text column):
   ```sql
   insert into public.institutions (id, name, type, created_at, updated_at)
   values (v_inst_id, 'Ministry of Finance', 'ministry', now(), now())
   on conflict (id) do nothing;
   ```

4. `auth.users` insert — include `auth.identities` insert immediately after (RESEARCH.md Pitfall 2 — missing identities causes login failure):
   ```sql
   -- auth.users
   insert into auth.users (
     id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
     created_at, updated_at
   ) values (
     v_admin_id,
     '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated',
     'admin@grcnexus.gov.zw',
     crypt('Admin@GRC2026!', gen_salt('bf')),
     now(),
     '{"provider":"email","providers":["email"]}',
     '{"first_name":"System","last_name":"Administrator"}',
     now(), now()
   ) on conflict (id) do nothing;

   -- auth.identities (REQUIRED — login fails without this)
   insert into auth.identities (
     id, user_id, identity_data, provider, provider_id,
     last_sign_in_at, created_at, updated_at
   ) values (
     v_admin_id, v_admin_id,
     format('{"sub":"%s","email":"admin@grcnexus.gov.zw"}', v_admin_id)::jsonb,
     'email', v_admin_id::text,
     now(), now(), now()
   ) on conflict (id) do nothing;
   ```

5. `user_profiles` insert — use `status = 'approved'` (not 'pending') for the superadmin, and set `active_role = 'admin'`:
   ```sql
   insert into public.user_profiles (id, institution_id, first_name, last_name, status, active_role, created_at, updated_at)
   values (v_admin_id, v_inst_id, 'System', 'Administrator', 'approved', 'admin', now(), now())
   on conflict (id) do nothing;
   ```

6. `user_roles` insert:
   ```sql
   insert into public.user_roles (user_id, institution_id, role_name, assigned_at)
   values (v_admin_id, v_inst_id, 'admin', now())
   on conflict (user_id, institution_id, role_name) do nothing;
   ```

7. Wrap everything in `BEGIN; ... COMMIT;` for atomicity.

After creating the migration file, push it:

```bash
npx supabase db push
```

**Accept criteria:**
- `supabase db push` exits 0
- Login with `admin@grcnexus.gov.zw` / `Admin@GRC2026!` succeeds in the Supabase Auth dashboard test
- Row exists in `auth.users`, `auth.identities`, `public.user_profiles`, `public.user_roles`
- `user_profiles.status = 'approved'` for the superadmin

**Verify:**
```sql
-- Confirm seed in Supabase SQL editor:
SELECT u.email, up.status, up.active_role, ur.role_name
FROM auth.users u
JOIN public.user_profiles up ON u.id = up.id
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@grcnexus.gov.zw';
-- Expected: 1 row with status=approved, active_role=admin, role_name=admin
```

---

### M2: Auth Flow

---

#### T-07 — Login page and register page (UI + Server Actions) [AUTH-01, AUTH-02, AUTH-03]

**Requires:** T-04 complete (layouts, schemas), T-05 complete (DB + types)
**Creates:** Login form, register form, pending page, all auth Server Actions, and auth API callback route

**Files created/modified:**
- `lib/auth/actions.ts`
- `lib/schemas/auth.ts` (verify existing — no changes expected)
- `app/(auth)/login/page.tsx`
- `app/(auth)/login/LoginForm.tsx`
- `app/(auth)/register/page.tsx`
- `app/(auth)/register/RegisterForm.tsx`
- `app/(auth)/register/pending/page.tsx`
- `app/api/auth/confirm/route.ts`

**Action:**

1. Create `lib/auth/actions.ts` — copy the exact implementation from PATTERNS.md `### lib/auth/actions.ts`. This is a `'use server'` file. Include all 4 Server Actions:
   - `signIn(values: LoginInput)` — validates with Zod, calls `signInWithPassword`, re-fetches with `getUser()`, routes to `/register/pending` if status=pending, `/role-select` if multiple roles, else `/dashboard`. Error message: exactly "Email address or password is incorrect. Please try again." (per UI-SPEC).
   - `signOut()` — calls `supabase.auth.signOut()`, inserts audit event for LOGOUT into `audit_events`, then `redirect('/login')`
   - `signUp(values: RegisterInput)` — validates with Zod, calls `supabase.auth.signUp()`, `redirect('/register/pending')`
   - `selectRole(role: string)` — (1) updates `user_profiles.active_role`, (2) calls `createAdminClient().auth.admin.updateUserById(userId, { app_metadata: { active_role: role } })`, (3) calls `supabase.auth.refreshSession()` to re-fire the JWT hook (RESEARCH.md Pitfall 3), (4) inserts audit event for ROLE_CHANGE, (5) `redirect('/dashboard')`

   [SECURITY] `selectRole` uses `createAdminClient()` for the admin API call. The admin client uses `SUPABASE_SERVICE_ROLE_KEY` — server-side only. Validate that the requested role is in the user's assigned roles before updating.

2. Create `app/(auth)/login/page.tsx` — copy PATTERNS.md `### app/(auth)/login/page.tsx`. Server Component shell. Includes `export const metadata`.

3. Create `app/(auth)/login/LoginForm.tsx` — copy PATTERNS.md `### app/(auth)/login/LoginForm.tsx`. `'use client'`. Uses `useForm` + `zodResolver(loginSchema)`, `useTransition`, calls `signIn()` Server Action. Form-level error in `Alert variant="destructive"` above the submit button. Never reveals which field failed. Button: gold, full-width, 44px height, spinner when pending.

   Per UI-SPEC Screen 1: Include institution logo placeholder (48px), "GRC-Nexus" heading (Playfair Display 28px/700 navy), sub-heading "Zimbabwe Governance Platform" (DM Sans 14px/400 navy-mid), divider, footer links ("Create an account" → /register, "Forgot password?" placeholder link).

4. Create `app/(auth)/register/page.tsx` — Server Component shell with metadata.

5. Create `app/(auth)/register/RegisterForm.tsx` — `'use client'`. Uses `registerSchema`. Fields: First name, Last name, Email, Password (with visibility toggle + strength indicator), Confirm password, Institution (disabled text field showing "Ministry of Finance"). Submit button: "Request Access". Per UI-SPEC Screen 3 layout.

   Password strength indicator: 4-segment bar below password field. Appears on first keystroke. Segments fill based on:
   - 1 red: < 8 chars
   - 2 orange: 8-11 chars
   - 3 yellow: 12+ chars, some policy met
   - 4 green: all policy met (12+, uppercase, number, symbol)

6. Create `app/(auth)/register/pending/page.tsx` — Per UI-SPEC Screen 4. Server Component. Shows CheckCircle icon (gold, 48px), heading "Account request submitted", body text with email placeholder, Info alert "What happens next?", "Return to sign in" button → /login.

7. Create `app/api/auth/confirm/route.ts` — copy PATTERNS.md `### app/api/auth/confirm/route.ts` exactly. This handles the email confirmation PKCE callback from Supabase.

**Accept criteria:**
- Visiting `/login` renders the auth card with GRC-Nexus header and sign-in form
- Visiting `/register` renders the registration form
- Submitting valid credentials redirects to `/dashboard` or `/role-select`
- Submitting invalid credentials shows "Email address or password is incorrect. Please try again." in an Alert
- Registering a new user creates a `pending` user in Supabase Auth
- Visiting `/register/pending` shows the confirmation screen
- `grep -n "getSession" lib/auth/actions.ts` returns no matches

**Verify:**
```bash
npm run dev
# Manual: visit http://localhost:3000/login, submit with admin credentials → redirects to /dashboard
# Manual: visit http://localhost:3000/register, submit new email → redirects to /register/pending
```

---

#### T-08 — Admin user management: approval queue and role assignment [AUTH-04] [AUTH-05]

**Requires:** T-07 complete; DB deployed (T-05, T-06)
**Creates:** Admin user management page with approval queue, role assignment, user status management

**Files created/modified:**
- `app/(protected)/admin/users/page.tsx`
- `app/(protected)/admin/users/UserManagementTable.tsx`
- `app/(protected)/admin/layout.tsx`
- `lib/auth/admin-actions.ts`

**Action:**

1. Create `app/(protected)/admin/layout.tsx` — Server Component. Verifies user is authenticated AND has `active_role === 'admin'`. Non-admin redirect to `/dashboard`. Add `export const dynamic = 'force-dynamic'`.

2. Create `lib/auth/admin-actions.ts` — `'use server'` file. Server Actions for admin operations:

   ```typescript
   'use server'

   import { createClient } from '@/lib/supabase/server'
   import { createAdminClient } from '@/lib/supabase/admin'
   import { sendRoleAssignmentEmail } from '@/lib/email/send-role-notification'
   import { revalidatePath } from 'next/cache'

   export async function approveUser(userId: string, role: string) {
     // 1. Verify caller is admin
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user || (user.app_metadata as Record<string, string>)?.active_role !== 'admin') {
       return { error: 'Unauthorized.' }
     }

     // 2. Get approving admin's institution_id
     const institutionId = (user.app_metadata as Record<string, string>)?.institution_id

     const admin = createAdminClient()

     // 3. Update user_profiles status to approved
     await supabase
       .from('user_profiles')
       .update({ status: 'approved' })
       .eq('id', userId)

     // 4. Insert into user_roles
     await supabase
       .from('user_roles')
       .insert({ user_id: userId, institution_id: institutionId, role_name: role, assigned_by: user.id })

     // 5. Update app_metadata via admin API so JWT hook picks it up
     await admin.auth.admin.updateUserById(userId, {
       app_metadata: { status: 'approved' },
     })

     // 6. Send notification email
     // (fetch user email from auth.users via admin client)
     const { data: targetUser } = await admin.auth.admin.getUserById(userId)
     if (targetUser?.user?.email) {
       const { data: profile } = await supabase
         .from('user_profiles')
         .select('first_name, last_name')
         .eq('id', userId)
         .single()

       await sendRoleAssignmentEmail({
         to: targetUser.user.email,
         name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim(),
         role,
         institutionName: 'Ministry of Finance', // TODO: fetch from institutions table
       })
     }

     // 7. Insert application-layer audit event for AUTH-08 permission change
     await supabase.from('audit_events').insert({
       actor_id: user.id,
       action: 'AUTH',
       table_name: 'user_roles',
       record_id: userId,
       event_type: 'permission_change',
       metadata: { new_role: role, new_status: 'approved' },
     })

     revalidatePath('/admin/users')
     return { success: true }
   }

   export async function rejectUser(userId: string) {
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user || (user.app_metadata as Record<string, string>)?.active_role !== 'admin') {
       return { error: 'Unauthorized.' }
     }

     const admin = createAdminClient()
     await admin.auth.admin.deleteUser(userId)
     revalidatePath('/admin/users')
     return { success: true }
   }

   export async function suspendUser(userId: string) {
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user || (user.app_metadata as Record<string, string>)?.active_role !== 'admin') {
       return { error: 'Unauthorized.' }
     }

     await supabase
       .from('user_profiles')
       .update({ status: 'suspended' })
       .eq('id', userId)

     const admin = createAdminClient()
     await admin.auth.admin.updateUserById(userId, {
       app_metadata: { status: 'suspended' },
       ban_duration: 'none', // Sets to banned via Supabase; see docs
     })

     // Insert application-layer audit event for AUTH-08 permission change
     await supabase.from('audit_events').insert({
       actor_id: user.id,
       action: 'AUTH',
       table_name: 'user_profiles',
       record_id: userId,
       event_type: 'permission_change',
       metadata: { new_status: 'suspended' },
     })

     revalidatePath('/admin/users')
     return { success: true }
   }
   ```

3. Create `app/(protected)/admin/users/page.tsx` — Server Component. `export const dynamic = 'force-dynamic'`. Fetches pending users (status=pending) and all users (joined with user_roles) from Supabase. Passes data to `UserManagementTable`.

   Data fetch query:
   ```typescript
   const { data: users } = await supabase
     .from('user_profiles')
     .select(`
       id, first_name, last_name, status, created_at,
       user_roles (role_name)
     `)
     .order('created_at', { ascending: false })
   ```

   Also fetch user emails via admin client (auth.users not directly queryable via RLS):
   ```typescript
   const adminClient = createAdminClient()
   const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers()
   ```

4. Create `app/(protected)/admin/users/UserManagementTable.tsx` — `'use client'`. TanStack Table for user list per UI-SPEC Screen 5. Columns: Name+Avatar, Email, Role(s) with badges, Status badge, Joined date (DM Mono), Actions.

   Actions per status:
   - `pending`: "Approve" button (opens inline role select + "Confirm Approval") + "Reject Request" button (opens Dialog confirmation)
   - `active`: "Edit roles" (outline, sm) + kebab menu (Suspend, View audit)
   - `suspended`: "Reactivate" button

   Filter bar: search input, Status select (All/Pending/Active/Suspended), Role select. Pagination: 20 rows per page.

   Use `useTransition` when calling `approveUser`, `rejectUser`, `suspendUser` Server Actions. Show row-level loading states on action buttons.

**Accept criteria:**
- `/admin/users` renders user list with pending users shown first
- Non-admin users visiting `/admin/users` are redirected to `/dashboard`
- Clicking "Approve" + selecting a role + "Confirm Approval" changes user status to Active and sends email notification
- Clicking "Reject Request" and confirming deletes the user
- Status badges render with correct colors per UI-SPEC

**Verify:**
```bash
npm run dev
# Manual: log in as admin@grcnexus.gov.zw, visit /admin/users
# Register a second test account, verify it appears in pending queue
# Approve test account, verify status changes to Active
```

---

#### T-09 — Role selection screen and dashboard placeholder [AUTH-04, AUTH-06]

**Requires:** T-07 complete, T-05 complete (DB + JWT hook active)
**Creates:** Role selection screen, dashboard page, logout endpoint, Resend email integration

**Files created/modified:**
- `app/(protected)/role-select/page.tsx`
- `app/(protected)/role-select/RoleSelectForm.tsx`
- `app/(protected)/dashboard/page.tsx`
- `lib/email/send-role-notification.ts`

**Action:**

1. Create `app/(protected)/role-select/page.tsx` — Server Component, `export const dynamic = 'force-dynamic'`. Reads `user.app_metadata.roles` from `getUser()`. If only 1 role, immediately calls `selectRole` and redirects to `/dashboard`. If 0 roles, redirects to `/register/pending` (no role assigned yet). Passes roles array to `RoleSelectForm`.

2. Create `app/(protected)/role-select/RoleSelectForm.tsx` — `'use client'`. Per UI-SPEC Screen 2: Each role rendered as a clickable card row showing:
   - Colored role badge (left)
   - Role label (DM Sans 16px/500 navy)
   - Role description from `ROLE_DESCRIPTIONS[role]` (13px/400 navy-mid)
   - Chevron right icon (far right)

   On click: calls `selectRole(role)` Server Action. Show loading state on selected card. Only one card active at a time. Footer: "Sign out" link.

3. Create `app/(protected)/dashboard/page.tsx` — Server Component, `export const dynamic = 'force-dynamic'`. Minimal Phase 1 dashboard: shows the authenticated user's name, active role badge, institution name. Includes a "Sign out" button (calls `signOut()` Server Action). Placeholder message: "Dashboard content is delivered in Phase 2."

4. Create `lib/email/send-role-notification.ts` — copy Pattern 12 from RESEARCH.md. Instantiates `new Resend(process.env.RESEND_API_KEY)`. Function signature: `sendRoleAssignmentEmail({ to, name, role, institutionName })`. If `RESEND_API_KEY` is not set, log a warning and return without throwing (allows dev environment without Resend configured).

**Accept criteria:**
- User with single role is redirected directly to `/dashboard` without seeing role-select screen
- User with multiple roles sees the role-select screen with all assigned roles
- Selecting a role updates `user_profiles.active_role` and redirects to `/dashboard`
- Dashboard shows user name and current role
- Clicking "Sign out" calls `signOut()` and redirects to `/login`

**Verify:**
```bash
npm run dev
# Manual: log in as admin, verify redirect to /dashboard (single role skips role-select)
# Assign second role to admin via SQL, log in again → verify /role-select appears
```

---

### M3: MFA System

---

#### T-10 — TOTP MFA enrollment: setup flow (Step 1 + 2A + 3) [AUTH-07]

**Requires:** T-04 complete, T-05 complete (DB), T-09 complete (dashboard reachable)
**Creates:** TOTP enrollment — QR display, code verification, backup codes display

**Files created/modified:**
- `lib/auth/mfa.ts`
- `lib/auth/recovery-codes.ts`
- `app/(protected)/mfa/setup/page.tsx`
- `app/(protected)/mfa/setup/MFASetupForm.tsx`
- `app/(protected)/mfa/setup/BackupCodesStep.tsx`

**Action:**

1. Create `lib/auth/mfa.ts` — copy Pattern 8 from RESEARCH.md exactly. Functions: `enrollTOTP()`, `verifyTOTPEnrollment(factorId, code)`, `completeMFAChallenge(factorId, code)`, `getMFALevel()`, `listMFAFactors()`. All use `createClient()` from `lib/supabase/client.ts` (browser client, for Client Component context).

2. Create `lib/auth/recovery-codes.ts` — copy Pattern 10 from RESEARCH.md exactly. Functions:
   - `generateRecoveryCodes(): string[]` — uses `crypto.randomBytes()` only (NEVER `Math.random()`)
   - `hashRecoveryCodes(codes: string[]): Promise<string[]>` — bcrypt with cost factor 12
   - `verifyRecoveryCode(submitted: string, storedHashes: string[]): Promise<number | null>` — returns index or null

3. Create a Server Action in `lib/auth/mfa-actions.ts` for saving backup codes:
   ```typescript
   'use server'
   export async function saveBackupCodes(hashedCodes: string[]) {
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) return { error: 'Unauthorized.' }

     // Delete any existing codes first
     await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)
     // Insert new hashed codes
     await supabase.from('mfa_backup_codes').insert(
       hashedCodes.map(code_hash => ({ user_id: user.id, code_hash }))
     )
     return { success: true }
   }
   ```

4. Create `app/(protected)/mfa/setup/page.tsx` — Server Component, `export const dynamic = 'force-dynamic'`. Checks if user already has MFA enrolled (via `getMFALevel()` or a server-side check). If already enrolled → redirect to `/dashboard`. Otherwise renders `MFASetupForm`.

5. Create `app/(protected)/mfa/setup/MFASetupForm.tsx` — `'use client'`. Three-step wizard per UI-SPEC Screen 6:

   **Step 1 — Choose method:** Two option cards: "Authenticator app" (Smartphone icon) and "Email one-time code" (Mail icon). Continue button disabled until selection made.

   **Step 2A — TOTP setup:** On mount, calls `enrollTOTP()`. Renders QR code using `qrcode.react` `<QRCodeSVG>` (200×200, white bg, border, radius-sm). Manual entry toggle shows secret key in DM Mono + copy button. 6-box OTP input. "Verify and activate" button calls `verifyTOTPEnrollment(factorId, code)`.

   **Step 3 — Backup codes:** After successful TOTP verification, generates 8 backup codes via `generateRecoveryCodes()`, hashes them via `hashRecoveryCodes()`, calls `saveBackupCodes(hashed)`. Displays plain codes in 2×4 grid (DM Mono 16px/500, #F3F7FD bg). Warning alert: "These codes will not be shown again." Download button (.txt), Copy button. Checkbox "I have saved my backup codes" — required to enable "Complete setup" button. On complete → `redirect('/dashboard')` with success toast.

6. Create `app/(protected)/mfa/setup/BackupCodesStep.tsx` — `'use client'`. Extracted backup codes display component for reuse. Handles download (creates Blob URL) and copy (navigator.clipboard). Shows success toast on each action.

**Accept criteria:**
- Admin or board-member user without MFA enrolled visiting `/dashboard` is redirected to `/mfa/setup` by middleware
- Step 1 shows method selection; Continue disabled until selection
- Step 2A shows QR code rendered by qrcode.react
- Entering correct TOTP code proceeds to Step 3
- Step 3 shows 8 backup codes; "Complete setup" disabled until checkbox checked
- After setup, user is redirected to `/dashboard`; middleware no longer redirects to `/mfa/setup`

**Verify:**
```bash
npx vitest run tests/auth/recovery-codes.test.ts
# Test: generateRecoveryCodes() returns array of 8 strings
# Test: hashRecoveryCodes() returns array of 8 strings different from input
# Test: verifyRecoveryCode() returns correct index for matching code
# Test: verifyRecoveryCode() returns null for non-matching code
```

---

#### T-11 — Email OTP MFA: custom flow via Resend + mfa_otp_challenges [AUTH-07]

**Requires:** T-10 complete; Resend API key set in `.env.local`
**Creates:** Custom email OTP flow — send, store hashed, verify; integrated into MFA setup Step 2B and challenge screen

**Files created/modified:**
- `app/api/mfa/email-otp/route.ts`
- `lib/auth/email-otp.ts`
- (Updates to) `app/(protected)/mfa/setup/MFASetupForm.tsx` (Step 2B already stubbed in T-10)

**Action:**

1. Create `lib/auth/email-otp.ts` — utility functions for the custom email OTP flow:

```typescript
// lib/auth/email-otp.ts
// Custom email OTP MFA — Supabase does not support email as MFA factor type.
// See RESEARCH.md Pitfall 7 and Open Question 1.
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Generate 6-digit OTP
export function generateOTPCode(): string {
  // Use crypto for secure random — NOT Math.random()
  const bytes = crypto.randomBytes(4)
  const num = bytes.readUInt32BE(0) % 1000000
  return num.toString().padStart(6, '0')
}

// Hash the OTP for DB storage
export async function hashOTPCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10) // cost 10 for OTP (short TTL = lower attack window)
}

// Verify submitted code against stored hash
export async function verifyOTPCode(submitted: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(submitted, storedHash)
}
```

2. Create `app/api/mfa/email-otp/route.ts` — two endpoints in one file:

```typescript
// POST /api/mfa/email-otp — send a new OTP code
// Body: { action: 'send' }
// GET /api/mfa/email-otp — verify submitted OTP
// Body: { action: 'verify', code: string }

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (body.action === 'send') {
    // 1. Generate + hash OTP
    const code = generateOTPCode()
    const codeHash = await hashOTPCode(code)

    // 2. Invalidate previous challenges for this user
    await supabase
      .from('mfa_otp_challenges')
      .delete()
      .eq('user_id', user.id)
      .is('used_at', null)

    // 3. Insert new challenge (expires in 10 min)
    await supabase.from('mfa_otp_challenges').insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    // 4. Send via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'GRC-Nexus <noreply@grcnexus.gov.zw>',
      to: [user.email!],
      subject: 'Your GRC-Nexus verification code',
      html: `<p>Your verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>This code expires in 10 minutes.</p>`,
    })

    return NextResponse.json({ success: true })
  }

  if (body.action === 'verify') {
    const { code } = body
    // 1. Find most recent unexpired, unused challenge
    const { data: challenge } = await supabase
      .from('mfa_otp_challenges')
      .select('id, code_hash, expires_at')
      .eq('user_id', user.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'MFA code expired. Please request a new code.' }, { status: 400 })
    }

    // 2. Verify hash
    const valid = await verifyOTPCode(code, challenge.code_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 })
    }

    // 3. Mark as used
    await supabase
      .from('mfa_otp_challenges')
      .update({ used_at: new Date().toISOString() })
      .eq('id', challenge.id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
```

3. Update `MFASetupForm.tsx` Step 2B — email OTP path:
   - On entering Step 2B: call `POST /api/mfa/email-otp` with `{ action: 'send' }` to trigger the first code
   - Show OTP input (6 boxes)
   - "Verify and activate" calls `POST /api/mfa/email-otp` with `{ action: 'verify', code }`
   - On success: proceed to Step 3 (backup codes)
   - "Resend code" link: disabled for 60s after send (countdown displayed), then re-enables and calls `send` again

**Accept criteria:**
- Email OTP method selected in Step 1 → Step 2B renders with instructions and 6-box OTP input
- Entering correct code proceeds to backup codes step
- Entering expired/wrong code shows error message per UI-SPEC: "Invalid verification code. Please try again."
- `mfa_otp_challenges` table gets a row with `used_at` set after successful verification

**Verify:**
```bash
npx vitest run tests/auth/email-otp.test.ts
# Test: generateOTPCode() returns string of exactly 6 digits
# Test: generateOTPCode() does not repeat on 100 calls (probabilistic)
# Test: verifyOTPCode() returns true for matching code, false for wrong code
```

---

#### T-12 — MFA challenge screen: TOTP + email OTP + backup code variants [AUTH-07]

**Requires:** T-10, T-11 complete
**Creates:** MFA challenge screen (post-login verification), backup code entry, device trust cookie

**Files created/modified:**
- `lib/auth/device-trust.ts`
- `lib/auth/mfa-actions.ts` (additions: `setDeviceTrustAction`, `completeMFAChallengeAction`)
- `app/(protected)/mfa/challenge/page.tsx`
- `app/(protected)/mfa/challenge/MFAChallengeForm.tsx`

**Action:**

1. Create `lib/auth/device-trust.ts` — copy Pattern 9 from RESEARCH.md. Key functions:
   - `setDeviceTrust(userId: string)` — generates HMAC-SHA256 token, stores hash in `mfa_device_trust` table, sets `grc_device_trust` httpOnly cookie (30-day maxAge)
   - `validateDeviceTrust(cookieValue: string, userId: string): Promise<boolean>` — looks up token hash in `mfa_device_trust`, checks `expires_at > now()`. This is the full validation (not just cookie presence).

   Token generation:
   ```typescript
   const token = crypto
     .createHmac('sha256', process.env.DEVICE_TRUST_SECRET!)
     .update(`${userId}:${Date.now()}`)
     .digest('hex')
   const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
   // Store tokenHash in DB; send token as cookie value
   ```

2. Add to `lib/auth/mfa-actions.ts`:

```typescript
export async function completeMFAChallengeAction(
  factorId: string,
  code: string,
  trustDevice: boolean
) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please sign in again.' }

  // TOTP challenge via Supabase
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: (await supabase.auth.mfa.challenge({ factorId })).data!.id,
    code,
  })

  if (error) {
    return { error: 'Invalid verification code. Please try again or request a new code.' }
  }

  if (trustDevice) {
    await setDeviceTrust(user.id)
  }

  // Insert audit event for successful MFA
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'AUTH',
    table_name: 'auth_events',
    record_id: user.id,
    event_type: 'mfa_verified',
    metadata: { method: 'totp' },
  })

  redirect('/dashboard')
}

export async function useBackupCodeAction(code: string, trustDevice: boolean) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please sign in again.' }

  // Fetch all unused backup codes for user
  const { data: codes } = await supabase
    .from('mfa_backup_codes')
    .select('id, code_hash')
    .eq('user_id', user.id)
    .is('used_at', null)

  if (!codes || codes.length === 0) {
    return { error: 'No backup codes available. Contact your administrator.' }
  }

  // Verify against each code
  const matchIndex = await verifyRecoveryCode(code, codes.map(c => c.code_hash))
  if (matchIndex === null) {
    return { error: 'Backup code not recognised. Verify the code and try again. Each code can only be used once.' }
  }

  // Mark matched code as used
  await supabase
    .from('mfa_backup_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', codes[matchIndex].id)

  if (trustDevice) {
    await setDeviceTrust(user.id)
  }

  redirect('/dashboard')
}
```

3. Create `app/(protected)/mfa/challenge/page.tsx` — Server Component, `export const dynamic = 'force-dynamic'`. Determines which MFA variant to show (TOTP or email OTP) by calling `listMFAFactors()`. Passes factor info to `MFAChallengeForm`.

4. Create `app/(protected)/mfa/challenge/MFAChallengeForm.tsx` — `'use client'`. Per UI-SPEC Screen 7. Three variants toggled by state:

   - **TOTP variant:** 6-box OTP input. "Trust this device for 30 days" checkbox. "Verify" button calls `completeMFAChallengeAction(factorId, code, trustDevice)`. "Use a backup code instead" link → switches to backup variant.

   - **Email OTP variant:** Shows "A code has been sent to [email]". 6-box OTP input. "Verify" calls verify endpoint. Resend link (60s cooldown). "Trust this device" checkbox. "Use a backup code instead" link.

   - **Backup code variant:** Single wide input (DM Mono 16px, placeholder "XXXX-XXXX"). "Use backup code" button calls `useBackupCodeAction(code, false)`. Warning Alert about single-use. "← Use authenticator code" link.

   MFA code submission failure: shake animation on OTP boxes (3-cycle, 4px horizontal, 120ms), border turns red.

**Accept criteria:**
- After login as admin (with MFA enrolled), user is redirected to `/mfa/challenge`
- Entering correct TOTP code redirects to `/dashboard`
- Checking "Trust this device" + verifying creates a row in `mfa_device_trust` and sets the `grc_device_trust` cookie
- On next login, middleware detects trust cookie and skips MFA redirect
- Entering wrong TOTP shows error with shake animation
- Entering a valid backup code marks it as `used_at` in DB and redirects to `/dashboard`

**Verify:**
```bash
npm run dev
# Manual flow: log in as admin with TOTP MFA enrolled
# Verify: /mfa/challenge renders, correct code → /dashboard
# Verify: re-login → skipped (device trust cookie present)
```

---

#### T-13 — Backup code regeneration and middleware MFA enforcement hardening [AUTH-07]

**Requires:** T-12 complete
**Creates:** Ability to regenerate backup codes from dashboard, full middleware MFA enforcement test

**Files created/modified:**
- `app/(protected)/dashboard/page.tsx` (additions: MFA status + regenerate codes button)
- `lib/auth/mfa-actions.ts` (addition: `regenerateBackupCodesAction`)
- `tests/auth/mfa.test.ts` (unit tests)

**Action:**

1. Add `regenerateBackupCodesAction` to `lib/auth/mfa-actions.ts`:

```typescript
export async function regenerateBackupCodesAction() {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const codes = generateRecoveryCodes()
  const hashed = await hashRecoveryCodes(codes)

  // Delete old codes
  await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)

  // Insert new hashed codes
  await supabase.from('mfa_backup_codes').insert(
    hashed.map(code_hash => ({ user_id: user.id, code_hash }))
  )

  return { success: true, codes } // Return plain codes — shown once
}
```

2. Update `app/(protected)/dashboard/page.tsx` to show:
   - User's MFA status (enrolled / not enrolled)
   - For admin/board-member: "Regenerate backup codes" button (opens Dialog showing new codes once)
   - Uses `BackupCodesStep` component from T-10 inside the Dialog

3. Create `tests/auth/mfa.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateRecoveryCodes, hashRecoveryCodes, verifyRecoveryCode } from '@/lib/auth/recovery-codes'
import { generateOTPCode } from '@/lib/auth/email-otp'

describe('Recovery codes', () => {
  it('generates exactly 8 codes', () => {
    const codes = generateRecoveryCodes()
    expect(codes).toHaveLength(8)
  })

  it('each code is a non-empty string', () => {
    const codes = generateRecoveryCodes()
    codes.forEach(c => expect(c.length).toBeGreaterThan(0))
  })

  it('verifyRecoveryCode returns index for matching code', async () => {
    const codes = generateRecoveryCodes()
    const hashed = await hashRecoveryCodes(codes)
    const idx = await verifyRecoveryCode(codes[3], hashed)
    expect(idx).toBe(3)
  })

  it('verifyRecoveryCode returns null for wrong code', async () => {
    const codes = generateRecoveryCodes()
    const hashed = await hashRecoveryCodes(codes)
    const idx = await verifyRecoveryCode('wrongcode', hashed)
    expect(idx).toBeNull()
  })
})

describe('Email OTP', () => {
  it('generates a 6-digit string', () => {
    const code = generateOTPCode()
    expect(code).toMatch(/^\d{6}$/)
  })
})
```

**Accept criteria:**
- `npx vitest run tests/auth/mfa.test.ts` exits 0 with all 5 tests passing
- "Regenerate backup codes" button on dashboard generates and displays new codes
- New codes are stored in DB; old codes are invalidated

**Verify:**
```bash
npx vitest run tests/auth/mfa.test.ts
```

---

### M4: Admin + Audit UI

---

#### T-14 — Email notification system (Resend integration) [AUTH-08]

**Requires:** T-09 complete; Resend API key set
**Creates:** Resend email service with role assignment notification and email OTP templates

Note: Email notifications were partially wired in T-08 (`approveUser` action calls `sendRoleAssignmentEmail`). This task completes the email system with React Email templates and login/logout audit event recording.

**Files created/modified:**
- `lib/email/send-role-notification.ts` (upgrade from Pattern 12 stub to React Email template)
- `lib/email/templates/RoleAssignmentEmail.tsx`
- `lib/auth/actions.ts` (add audit INSERT for login/logout events)

**Action:**

1. Create `lib/email/templates/RoleAssignmentEmail.tsx` — React Email component:

```typescript
import { Html, Head, Body, Container, Heading, Text, Section } from '@react-email/components'

interface RoleAssignmentEmailProps {
  name: string
  role: string
  institutionName: string
}

export function RoleAssignmentEmail({ name, role, institutionName }: RoleAssignmentEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#F3F7FD', fontFamily: 'DM Sans, sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
          <Section style={{ backgroundColor: '#050D1B', padding: '24px', borderRadius: '10px 10px 0 0' }}>
            <Heading style={{ color: '#C8A44A', margin: 0, fontFamily: 'Georgia, serif' }}>
              GRC-Nexus
            </Heading>
          </Section>
          <Section style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '0 0 10px 10px', border: '1px solid #D7E2EF' }}>
            <Heading as="h2" style={{ color: '#0B1625', fontSize: 20 }}>
              Role Assignment Notification
            </Heading>
            <Text style={{ color: '#3A5270' }}>Dear {name},</Text>
            <Text style={{ color: '#3A5270' }}>
              Your role at <strong style={{ color: '#0B1625' }}>{institutionName}</strong> has been set to{' '}
              <strong style={{ color: '#0B1625' }}>{role}</strong>.
            </Text>
            <Text style={{ color: '#3A5270' }}>
              You can now sign in to GRC-Nexus and select this role to access the platform.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

2. Update `lib/email/send-role-notification.ts` to use the React Email template with `renderAsync`:

```typescript
import { Resend } from 'resend'
import { renderAsync } from '@react-email/components'
import { RoleAssignmentEmail } from './templates/RoleAssignmentEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRoleAssignmentEmail(params: {
  to: string
  name: string
  role: string
  institutionName: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping role assignment email')
    return
  }

  const html = await renderAsync(
    RoleAssignmentEmail({ name: params.name, role: params.role, institutionName: params.institutionName })
  )

  const { error } = await resend.emails.send({
    from: 'GRC-Nexus <noreply@grcnexus.gov.zw>',
    to: [params.to],
    subject: 'Your GRC-Nexus role has been updated',
    html,
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}
```

3. Update `lib/auth/actions.ts` `signIn` action — after successful login, insert an audit event:
   ```typescript
   await supabase.from('audit_events').insert({
     actor_id: user.id,
     action: 'AUTH',
     table_name: 'auth_events',
     record_id: user.id,
     event_type: 'login',
     metadata: {},
   })
   ```

4. Update `lib/auth/actions.ts` `signOut` action — before signing out, insert a LOGOUT audit event:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   if (user) {
     await supabase.from('audit_events').insert({
       actor_id: user.id,
       action: 'AUTH',
       table_name: 'auth_events',
       record_id: user.id,
       event_type: 'logout',
       metadata: {},
     })
   }
   await supabase.auth.signOut()
   ```

**Accept criteria:**
- Role assignment email is sent when admin approves a user (verifiable via Resend dashboard logs)
- Login creates an audit event row with `event_type = 'login'`
- Logout creates an audit event row with `event_type = 'logout'`
- When `RESEND_API_KEY` is not set, email send logs a warning and does NOT throw (dev graceful degradation)

**Verify:**
```bash
npm run dev
# Manual: approve a user as admin → check Resend dashboard for sent email
# Manual: log in → query audit_events for login event
```

---

#### T-15 — SHA-256 file checksum utility [TRAIL-04]

**Requires:** T-05 complete (DB schema)
**Creates:** SHA-256 checksum utility for evidence file integrity verification (used by Phase 4 compliance module but foundational infrastructure in Phase 1 per TRAIL-04)

**Files created/modified:**
- `lib/files/checksum.ts`
- `tests/files/checksum.test.ts`

**Action:**

1. Create `lib/files/checksum.ts`:

```typescript
// lib/files/checksum.ts
// SHA-256 checksum utility for evidence file integrity (TRAIL-04)
// Computed server-side on download — never trusted from client
import crypto from 'crypto'

// Compute SHA-256 hash of a Buffer or Uint8Array
export function computeSHA256(data: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

// Verify file integrity: compare computed hash against stored hash
// Returns true if file is unmodified, false if tampered
export function verifyChecksum(data: Buffer | Uint8Array, storedHash: string): boolean {
  const computed = computeSHA256(data)
  // Constant-time comparison to prevent timing attacks
  if (computed.length !== storedHash.length) return false
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(storedHash, 'hex')
  )
}

// Helper for use in Next.js Route Handlers that stream file downloads
// Usage: compute hash at upload time, store in DB; call verifyChecksum on download
export async function computeFileHash(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  return computeSHA256(buffer)
}
```

2. Create `tests/files/checksum.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeSHA256, verifyChecksum } from '@/lib/files/checksum'

describe('SHA-256 checksum', () => {
  it('returns a 64-character hex string', () => {
    const hash = computeSHA256(Buffer.from('test data'))
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('returns the same hash for the same input', () => {
    const data = Buffer.from('governance document content')
    const h1 = computeSHA256(data)
    const h2 = computeSHA256(data)
    expect(h1).toBe(h2)
  })

  it('returns different hashes for different inputs', () => {
    const h1 = computeSHA256(Buffer.from('content A'))
    const h2 = computeSHA256(Buffer.from('content B'))
    expect(h1).not.toBe(h2)
  })

  it('verifyChecksum returns true for matching data', () => {
    const data = Buffer.from('evidence file')
    const hash = computeSHA256(data)
    expect(verifyChecksum(data, hash)).toBe(true)
  })

  it('verifyChecksum returns false for tampered data', () => {
    const original = Buffer.from('original')
    const hash = computeSHA256(original)
    const tampered = Buffer.from('tampered')
    expect(verifyChecksum(tampered, hash)).toBe(false)
  })

  it('verifyChecksum uses timing-safe comparison', () => {
    // Structural test — ensure function does not throw with mismatched length hash
    expect(() => verifyChecksum(Buffer.from('x'), 'notahex')).not.toThrow()
  })
})
```

**Accept criteria:**
- `npx vitest run tests/files/checksum.test.ts` exits 0 with all 6 tests passing
- `computeSHA256` returns the same hash deterministically for the same input
- `verifyChecksum` correctly detects tampered content

**Verify:**
```bash
npx vitest run tests/files/checksum.test.ts
```

---

#### T-16 — Audit log viewer UI [TRAIL-01, TRAIL-02, AUTH-08]

**Requires:** T-08 complete (admin layout), T-05 complete (audit_events table)
**Creates:** Filterable audit log viewer with TanStack Table, inline diff expansion, CSV export

**Files created/modified:**
- `app/(protected)/admin/audit-log/page.tsx`
- `app/(protected)/admin/audit-log/AuditLogTable.tsx`
- `app/(protected)/admin/audit-log/FilterBar.tsx`
- `app/(protected)/admin/audit-log/DiffViewer.tsx`
- `app/api/audit/export/route.ts`

**Action:**

1. Create `app/(protected)/admin/audit-log/page.tsx` — Server Component, `export const dynamic = 'force-dynamic'`. Access: `admin` and `audit-officer` roles only (redirect others to `/dashboard`). Reads URL search params for filter state. Fetches audit events server-side with filters applied:

```typescript
const { data: events, count } = await supabase
  .from('audit_events')
  .select('id, actor_id, action, table_name, record_id, before_state, after_state, occurred_at, event_type, metadata', { count: 'exact' })
  .order('occurred_at', { ascending: false })
  .range(offset, offset + pageSize - 1)
  // Apply optional filters from searchParams
```

Fetch actor display names via a join or separate query (actor email from auth.users via admin client, or denormalized from user_profiles).

2. Create `app/(protected)/admin/audit-log/FilterBar.tsx` — `'use client'` component. Per UI-SPEC Screen 8 filter bar:
   - Actor search input (text, 240px)
   - Action type Select (All / INSERT / UPDATE / DELETE)
   - Table name Select (All tables / known governance tables)
   - Date from / Date to inputs (type=date)
   - "Apply filters" button (gold) — pushes to URL query params using `useRouter().push()`
   - "Clear" button (outline) — resets all filters in URL

3. Create `app/(protected)/admin/audit-log/AuditLogTable.tsx` — `'use client'`. TanStack Table. Columns per UI-SPEC Screen 8:
   - Timestamp (DM Mono 13px, sortable)
   - Actor (Avatar 24px + name + role badge)
   - Action badge (INSERT=green-tint, UPDATE=blue-tint, DELETE=red-tint)
   - Table (DM Mono 13px)
   - Record ID (DM Mono, truncated to 8 chars, hover tooltip shows full UUID via shadcn Tooltip)
   - Details expand chevron (aria-expanded toggle)

   Inline diff row (below parent row on expand): two columns Before / After. Deleted fields in Before: red text. Added fields in After: green text.

4. Create `app/(protected)/admin/audit-log/DiffViewer.tsx` — `'use client'`. Renders JSONB diff between `before_state` and `after_state`. Highlights changed fields: keys present in before but absent or changed in after are marked red in before, green in after. Uses DM Mono 13px, #F3F7FD background, max-height 200px with overflow scroll.

5. Create `app/api/audit/export/route.ts` — Route Handler for CSV export:

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !['admin', 'audit-officer'].includes((user.app_metadata as Record<string, string>)?.active_role)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Fetch all events (no pagination) with same filters from query params
  const { data: events } = await supabase
    .from('audit_events')
    .select('occurred_at, actor_id, action, table_name, record_id, event_type')
    .order('occurred_at', { ascending: false })

  // Build CSV
  const headers = 'Timestamp,Actor ID,Action,Table,Record ID,Event Type\n'
  const rows = (events ?? []).map(e =>
    `"${e.occurred_at}","${e.actor_id ?? ''}","${e.action}","${e.table_name}","${e.record_id}","${e.event_type ?? ''}"`
  ).join('\n')

  return new Response(headers + rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit-log-${Date.now()}.csv"`,
    },
  })
}
```

**Accept criteria:**
- `/admin/audit-log` renders filterable table showing audit events in descending timestamp order
- INSERT actions show green badge, UPDATE show blue, DELETE show red
- Clicking the expand chevron on a row shows Before/After JSONB diff inline
- Filter bar: selecting action type + clicking "Apply filters" updates URL and reloads with filtered results
- "Export CSV" button triggers file download of current filtered audit events
- Record ID column truncates to 8 chars with full UUID visible on hover
- `audit-officer` role can access audit log but cannot modify any records (RLS enforces this)

**Verify:**
```bash
npm run dev
# Manual: log in as admin, perform an INSERT/UPDATE on user_profiles (approve a user)
# Visit /admin/audit-log, verify the event appears
# Expand the row, verify before/after JSON shown
# Click "Export CSV", verify file downloads
```

---

## Threat Model

### Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Next.js Middleware | All inbound requests — untrusted headers, cookies, query params |
| Next.js Server → Supabase Auth | JWT validation via `getUser()` network call — not local cookie read |
| Next.js Server → Supabase DB | Row-Level Security enforced at Postgres layer regardless of app-layer logic |
| Server Action → Admin API | Service Role key operations — must stay server-side; never in client components |
| Postgres Trigger → audit_events | SECURITY DEFINER context — bypasses RLS but is controlled code |

### STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-01-01 | Spoofing | `middleware.ts` / `getSession()` misuse | mitigate | Use `getUser()` exclusively in all server contexts; validated against Supabase public keys over the network (RESEARCH.md Pitfall 1) |
| T-01-02 | Spoofing | JWT `app_metadata` claims forgery | mitigate | Claims injected only by `custom_access_token_hook` (server-side DB function); users cannot modify `app_metadata` via client SDK (Supabase enforces) |
| T-01-03 | Spoofing | Credential stuffing on `/login` | mitigate | Supabase Auth built-in rate limiting; generic error message "Email address or password is incorrect" (no field-level hint) |
| T-01-04 | Spoofing | TOTP replay attack | mitigate | Supabase TOTP: each code single-use + 30-second window with 1-interval clock skew tolerance |
| T-01-05 | Spoofing | Email OTP brute force | mitigate | bcrypt-hashed OTP codes; 10-minute TTL; previous codes invalidated on new send |
| T-01-06 | Tampering | `audit_events` modification | mitigate | Three-layer defense: REVOKE UPDATE/DELETE + RESTRICTIVE RLS + BEFORE trigger RAISE EXCEPTION (T-06, migration 4) |
| T-01-07 | Tampering | Sensitive fields in audit JSONB | mitigate | `v_excluded_fields` array applied via `to_jsonb(NEW) - v_excluded_fields` in trigger (T-05, migration 3) |
| T-01-08 | Tampering | ISR cache poisoning via Set-Cookie | mitigate | `export const dynamic = 'force-dynamic'` on all authenticated routes and layouts (T-04, T-08, T-09, T-16) |
| T-01-09 | Repudiation | Login/logout not recorded | mitigate | `signIn` and `signOut` Server Actions insert audit events into `audit_events` (T-14) |
| T-01-10 | Information Disclosure | Service Role key in client bundle | mitigate | `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix; only imported in `lib/supabase/admin.ts` (server-only); Next.js build fails if `NEXT_PUBLIC_` prefix is used for secrets |
| T-01-11 | Information Disclosure | Cross-institution data leak via RLS bypass | mitigate | RLS enforced at Postgres layer with `force row level security`; `institution_id` FK on all tables; `(SELECT auth.institution_id())` cached per-statement (not per-row) |
| T-01-12 | Information Disclosure | auth.jwt() unauthenticated access | mitigate | All RLS policies scoped `TO authenticated`; anon role has no SELECT policy on governance tables |
| T-01-13 | Elevation of Privilege | Pending user accessing protected routes | mitigate | `(protected)/layout.tsx` checks `app_metadata.status !== 'pending'` in addition to middleware; dual-layer enforcement |
| T-01-14 | Elevation of Privilege | SECURITY DEFINER function search_path injection | mitigate | All SECURITY DEFINER functions include `set search_path = ''` and use fully qualified names (RESEARCH.md Pitfall 5) |
| T-01-15 | Elevation of Privilege | Admin API called without role verification | mitigate | All Server Actions using `createAdminClient()` verify `active_role === 'admin'` before proceeding |
| T-01-16 | Denial of Service | Unbounded audit export | accept | Phase 1 prototype scope; add pagination/streaming in Phase 8 when data volume warrants |
| T-01-17 | Spoofing | Seed credentials in production | mitigate | Document: change `Admin@GRC2026!` immediately after deployment; note in seed file comments |

---

## Nyquist Validation Checklist

The following critical behaviors must be verified before calling Phase 1 complete. For each item, the verification command or manual step is specified.

### Authentication Flows

- [ ] **Login success:** `admin@grcnexus.gov.zw` + `Admin@GRC2026!` → redirects to `/dashboard`
  `Manual: npm run dev, visit /login, submit credentials`

- [ ] **Login failure:** Wrong password → shows "Email address or password is incorrect. Please try again." in Alert above submit button; does NOT reveal which field failed
  `Manual: submit wrong password on /login`

- [ ] **Register → pending:** New email registration creates user with `status = 'pending'` in `user_profiles`; redirects to `/register/pending`
  `Manual: register new account, verify Supabase dashboard shows pending status`

- [ ] **Role selection:** User with 2+ roles sees `/role-select` screen; selecting a role updates `user_profiles.active_role` and JWT; redirects to `/dashboard`
  `Manual: assign second role to admin via SQL, log in, verify role-select appears`

- [ ] **Logout:** Clicking sign-out from `/dashboard` calls `signOut()`, clears session cookie, redirects to `/login`; subsequent visit to `/dashboard` redirects to `/login`
  `Manual: log in, log out, attempt to visit /dashboard directly`

### MFA

- [ ] **TOTP enrollment:** Admin user without MFA visiting `/dashboard` is redirected to `/mfa/setup`
  `Manual: create admin user without MFA, log in, verify redirect`

- [ ] **TOTP challenge:** Admin user with MFA enrolled sees `/mfa/challenge` after login; entering correct TOTP code redirects to `/dashboard`
  `Manual: enroll TOTP, log out, log in again`

- [ ] **Email OTP flow:** Selecting email OTP in MFA setup → Resend delivers a 6-digit code → entering code proceeds to backup codes step
  `Manual: MFA setup → choose email method → verify code received`

- [ ] **Backup codes:** 8 codes generated, displayed once; `mfa_backup_codes` has 8 rows for user; codes are bcrypt hashes
  `SQL: SELECT COUNT(*) FROM mfa_backup_codes WHERE user_id = '<admin-id>';  -- expect 8`

- [ ] **Device trust skip:** After MFA with "Trust this device" checked, next login skips `/mfa/challenge`
  `Manual: verify, re-login, confirm no MFA prompt`

- [ ] **Backup code use:** Using a backup code sets `used_at` on that row; attempting the same code again fails
  `SQL after use: SELECT used_at FROM mfa_backup_codes WHERE user_id = '<id>' LIMIT 1;  -- expect non-null`

### RLS

- [ ] **Cross-institution block:** User A (institution 1) cannot read User B's data from institution 2
  `SQL: connect as institution-1 user, SELECT * FROM user_profiles WHERE institution_id = '<institution-2-id>';  -- expect 0 rows`

- [ ] **institution_id scoping:** All queries return only rows matching the authenticated user's `institution_id` from JWT
  `Manual: verify dashboard/admin pages show only own institution's users`

### Audit Trail

- [ ] **INSERT trigger:** Insert a row into `institutions` or `user_profiles` → row appears in `audit_events` with `action = 'INSERT'`
  `SQL: INSERT INTO user_profiles ... ; SELECT * FROM audit_events ORDER BY occurred_at DESC LIMIT 1;`

- [ ] **UPDATE trigger:** Update a `user_profiles` row → `audit_events` shows `before_state` (old values) and `after_state` (new values)
  `SQL: UPDATE user_profiles SET first_name = 'Test'; SELECT before_state, after_state FROM audit_events ORDER BY occurred_at DESC LIMIT 1;`

- [ ] **DELETE trigger:** Delete a governance row → `audit_events` shows `before_state` with deleted values, `after_state = null`
  `SQL: DELETE FROM user_roles WHERE ...; SELECT before_state, after_state FROM audit_events ORDER BY occurred_at DESC LIMIT 1;`

- [ ] **Append-only enforcement:** Attempting UPDATE on `audit_events` raises exception
  `SQL: UPDATE audit_events SET actor_id = null WHERE false;  -- expect: ERROR: audit_events is append-only`

- [ ] **Sensitive field exclusion:** `before_state` and `after_state` do NOT contain `password`, `encrypted_password`, or `hashed_token` keys
  `SQL: SELECT before_state ? 'encrypted_password' FROM audit_events LIMIT 5;  -- expect all false`

### Admin Approval

- [ ] **Pending user blocked:** Pending user visiting `/dashboard` is redirected to `/register/pending`
  `Manual: register new account (pending), attempt to visit /dashboard directly → redirected`

- [ ] **Admin approve:** Admin approves pending user with role assignment → user status updates to `approved`, role row inserted in `user_roles`, notification email sent
  `Manual: admin visits /admin/users, approves pending user, verify status badge changes to Active`

### SHA-256 Checksum

- [ ] **checksum.ts unit tests:** All 6 tests in `tests/files/checksum.test.ts` pass
  `npx vitest run tests/files/checksum.test.ts`

---

## Phase Success Criteria

Phase 1 is complete when ALL of the following are true:

1. `npm run build` exits 0 with no type errors and no lint errors
2. `npx vitest run` exits 0 — all unit tests pass (recovery codes, email OTP, checksum)
3. Full manual auth flow works end-to-end: register → pending → admin approval → login → role select → dashboard → logout
4. MFA setup works for both TOTP and email OTP methods; backup codes generated and stored
5. Device trust: 30-day cookie set after MFA verification; subsequent login skips MFA challenge
6. RLS enforcement verified: cross-institution query returns 0 rows
7. Audit trigger fires on INSERT/UPDATE/DELETE for governance tables; events appear in `audit_events`
8. Attempting UPDATE or DELETE on `audit_events` raises `insufficient_privilege` exception
9. Admin user management: approval, rejection, and suspension flows functional
10. Audit log viewer at `/admin/audit-log` shows events with inline diff, filterable, CSV-exportable
11. SHA-256 checksum utility passes all unit tests

---

## Summary Output

After all tasks complete, create `.planning/phases/01-foundation-authentication-rls-and-audit-trail/01-SUMMARY.md` with:

- Which tasks were completed
- Any deviations from this plan (and why)
- Actual files created vs. planned
- Any open issues or follow-up items for subsequent phases
- Seed credentials reminder: change `Admin@GRC2026!` before any non-dev deployment
