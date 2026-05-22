# Phase 2: Strategic Planning — Objectives and KPIs - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 20 new/modified files
**Analogs found:** 18 / 20 (1 new pattern established — sparkline; 1 partial — section layout)

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20260522000007_strategic_schema.sql` | migration | batch | `20260522000001_base_schema.sql` | exact |
| `supabase/migrations/20260522000008_strategic_rls.sql` | migration | batch | `20260522000002_rls_policies.sql` | exact |
| `supabase/migrations/20260522000009_strategic_triggers.sql` | migration | batch | `20260522000003_audit_triggers.sql` | exact |
| `lib/schemas/strategic.ts` | schema | transform | `lib/schemas/auth.ts` | exact |
| `lib/strategic/actions.ts` | server action | CRUD | `lib/auth/actions.ts` + `lib/auth/admin-actions.ts` | exact |
| `lib/strategic/kpi-utils.ts` | utility | transform | `lib/auth/recovery-codes.ts` (pure util pattern) | role-match |
| `types/strategic.ts` | type definition | — | `types/auth.ts` | exact |
| `app/(protected)/strategic/layout.tsx` | layout | request-response | `app/(protected)/admin/layout.tsx` | exact |
| `app/(protected)/strategic/page.tsx` | page (Server Component) | CRUD | `app/(protected)/admin/audit-log/page.tsx` | exact |
| `app/(protected)/strategic/KpiGrid.tsx` | component (Client Component) | CRUD | `app/(protected)/admin/audit-log/AuditLogTable.tsx` | exact |
| `app/(protected)/strategic/KpiFilterBar.tsx` | component (Client Component) | request-response | `app/(protected)/admin/audit-log/FilterBar.tsx` | exact |
| `app/(protected)/strategic/KpiSparkline.tsx` | component (Client Component) | transform | no analog — new pattern | none |
| `app/(protected)/strategic/objectives/page.tsx` | page (Server Component) | CRUD | `app/(protected)/admin/users/page.tsx` | exact |
| `app/(protected)/strategic/objectives/ObjectivesTable.tsx` | component (Client Component) | CRUD | `app/(protected)/admin/users/UserManagementTable.tsx` | exact |
| `app/(protected)/strategic/objectives/new/page.tsx` | page (Server Component shell) | request-response | `app/(auth)/register/page.tsx` | role-match |
| `app/(protected)/strategic/objectives/new/ObjectiveForm.tsx` | component (Client Component) | request-response | `app/(auth)/register/RegisterForm.tsx` | exact |
| `app/(protected)/strategic/objectives/[id]/page.tsx` | page (Server Component) | CRUD | `app/(protected)/admin/users/page.tsx` | role-match |
| `app/(protected)/strategic/objectives/[id]/edit/page.tsx` | page (Server Component shell) | request-response | `app/(auth)/register/page.tsx` | role-match |
| `app/(protected)/strategic/kpis/new/page.tsx` | page (Server Component shell) | request-response | `app/(auth)/register/page.tsx` | role-match |
| `app/(protected)/strategic/kpis/new/KpiForm.tsx` | component (Client Component) | request-response | `app/(auth)/register/RegisterForm.tsx` | exact |
| `app/(protected)/strategic/kpis/[id]/page.tsx` | page (Server Component) | CRUD | `app/(protected)/admin/users/page.tsx` | role-match |
| `app/(protected)/strategic/kpis/[id]/readings/new/page.tsx` | page (Server Component shell) | request-response | `app/(auth)/register/page.tsx` | role-match |
| `app/(protected)/strategic/kpis/[id]/readings/new/ReadingForm.tsx` | component (Client Component) | request-response | `app/(auth)/register/RegisterForm.tsx` | exact |
| `app/(protected)/layout.tsx` | layout | request-response | existing file — modify only (add sidebar nav item) | modify |

---

## Pattern Assignments

---

### `supabase/migrations/20260522000007_strategic_schema.sql` (migration, batch)

**Analog:** `supabase/migrations/20260522000001_base_schema.sql`

**Migration file header pattern** (lines 1-4):
```sql
-- Migration: 20260522000007_strategic_schema.sql
-- Phase 2 Strategic Planning: strategic_objectives, kpis, kpi_readings tables
-- SECURITY: RLS is enabled in subsequent migration (20260522000008_strategic_rls.sql)
```

**Enum declaration pattern** (lines 14-27 of base_schema.sql):
```sql
create type public.nds2_pillar as enum (
  'economic_transformation',
  'social_development',
  'infrastructure_development',
  'environmental_sustainability',
  'governance_and_institutions',
  'innovation_and_technology',
  'regional_and_international_integration',
  'rural_and_urban_development'
);

create type public.objective_status as enum (
  'draft', 'active', 'at_risk', 'completed', 'cancelled'
);

create type public.kpi_frequency as enum (
  'monthly', 'quarterly', 'semi_annual', 'annual'
);
```

**Table + index declaration pattern** (lines 32-60 of base_schema.sql — copy structure exactly):
```sql
create table public.strategic_objectives (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete restrict,
  title             text not null,
  description       text,
  owner_id          uuid references auth.users(id) on delete set null,
  start_date        date,
  target_date       date,
  status            public.objective_status not null default 'draft',
  nds2_pillar       public.nds2_pillar,
  institutional_goal text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Index naming: idx_{table}_{column}
create index idx_strategic_objectives_institution_id on public.strategic_objectives (institution_id);
create index idx_strategic_objectives_status on public.strategic_objectives (status);
create index idx_strategic_objectives_owner_id on public.strategic_objectives (owner_id);
```

**Rules:**
- Every governance table requires `institution_id uuid not null references public.institutions(id)`
- Every table needs `created_at timestamptz not null default now()`
- Index naming pattern is `idx_{table}_{column}` — enforced across all Phase 1 indexes
- Enums go at the top of the migration, before table definitions
- New enums must NOT be added to Phase 1 migrations — they live in Phase 2's schema migration
- Migration filename: `20260522000007_strategic_schema.sql` — timestamp is the Phase 1 date + sequential suffix 000007 (Phase 1 ended at 000006)

---

### `supabase/migrations/20260522000008_strategic_rls.sql` (migration, batch)

**Analog:** `supabase/migrations/20260522000002_rls_policies.sql`

**RLS enable + force pattern** (lines 26-27, 54-55 of rls_policies.sql):
```sql
alter table public.strategic_objectives enable row level security;
alter table public.strategic_objectives force row level security;
```

**Institution-scoped SELECT policy** (lines 29-32 of rls_policies.sql — use `(select auth.institution_id())` wrapper — never inline call):
```sql
create policy "strategic_objectives_select" on public.strategic_objectives
  for select to authenticated
  using (institution_id = (select auth.institution_id()));
```

**Role-gated INSERT policy with AND clause** (lines 34-40 of rls_policies.sql):
```sql
create policy "strategic_objectives_insert" on public.strategic_objectives
  for insert to authenticated
  with check (
    institution_id = (select auth.institution_id())
    and (select auth.active_role()) in ('admin', 'ceo')
  );

create policy "strategic_objectives_update" on public.strategic_objectives
  for update to authenticated
  using (institution_id = (select auth.institution_id()))
  with check (
    institution_id = (select auth.institution_id())
    and (select auth.active_role()) in ('admin', 'ceo')
  );
```

**KPIs policy pattern** — `risk-officer` is also allowed for INSERT/UPDATE (D-10):
```sql
create policy "kpis_insert" on public.kpis
  for insert to authenticated
  with check (
    institution_id = (select auth.institution_id())
    and (select auth.active_role()) in ('admin', 'ceo', 'risk-officer')
  );
```

**KPI readings — owner-or-admin pattern** (D-13 — owner_id check requires joining; use a subquery):
```sql
create policy "kpi_readings_insert" on public.kpi_readings
  for insert to authenticated
  with check (
    institution_id = (select auth.institution_id())
    and (
      (select auth.active_role()) = 'admin'
      or recorded_by = auth.uid()
    )
  );
```

**Required performance index** (lines 144-150 of base_schema.sql pattern):
```sql
create index idx_kpis_institution_id on public.kpis (institution_id);
create index idx_kpis_objective_id on public.kpis (objective_id);
create index idx_kpi_readings_institution_id on public.kpi_readings (institution_id);
create index idx_kpi_readings_kpi_id on public.kpi_readings (kpi_id);
```

**Rules:**
- `auth.institution_id()` and `auth.active_role()` helper functions already exist from Phase 1 — do NOT redefine them
- Always add `TO authenticated` on every policy (lines 30, 35 of rls_policies.sql)
- Always wrap helper calls in `(select ...)` — never inline (performance: caches per statement, not per row)
- Policy naming pattern: `{table}_{verb}` e.g. `strategic_objectives_select`, `kpis_insert`

---

### `supabase/migrations/20260522000009_strategic_triggers.sql` (migration, batch)

**Analog:** `supabase/migrations/20260522000003_audit_triggers.sql`

**Audit trigger attachment pattern** (lines 117-119 of audit_triggers.sql — this is the full Phase 2 addition):
```sql
-- Migration: 20260522000009_strategic_triggers.sql
-- Phase 2: Attach audit triggers to strategic planning tables.
-- audit.attach_audit_trigger() is defined in Phase 1 migration 20260522000003.

select audit.attach_audit_trigger('strategic_objectives');
select audit.attach_audit_trigger('kpis');
select audit.attach_audit_trigger('kpi_readings');
```

**Rules:**
- `audit.create_audit_event()` and `audit.attach_audit_trigger()` already exist — do NOT redefine
- One call per table — no other SQL needed in this migration beyond the three `select audit.attach_audit_trigger(...)` calls
- Tables must exist (migration 000007 runs first) before triggers can be attached

---

### `lib/schemas/strategic.ts` (schema, transform)

**Analog:** `lib/schemas/auth.ts`

**File header + import pattern** (lines 1-4 of auth.ts):
```typescript
// lib/schemas/strategic.ts
// Zod v3 validation schemas for strategic planning forms.
// CONSTRAINT: Zod v3.x only — no v4 APIs. z.coerce is v3-compatible.
import { z } from 'zod'
```

**Enum + schema definition pattern** (lines 18-34 of auth.ts — define enum schemas first, then object schemas):
```typescript
// Replicate D-12: reporting period label validation per frequency
const PERIOD_PATTERNS: Record<string, RegExp> = {
  monthly:     /^\d{4}-M\d{2}$/,       // e.g. 2026-M03
  quarterly:   /^\d{4}-Q[1-4]$/,       // e.g. 2026-Q1
  semi_annual: /^\d{4}-H[12]$/,        // e.g. 2026-H1
  annual:      /^\d{4}$/,              // e.g. 2026
}

export const objectiveSchema = z.object({
  title:              z.string().min(1, 'Objective title is required.'),
  description:        z.string().optional(),
  owner_id:           z.string().uuid('Please select a valid owner.'),
  start_date:         z.string().optional(),
  target_date:        z.string().optional(),
  status:             z.enum(['draft', 'active', 'at_risk', 'completed', 'cancelled']),
  nds2_pillar:        z.enum([
    'economic_transformation', 'social_development', 'infrastructure_development',
    'environmental_sustainability', 'governance_and_institutions',
    'innovation_and_technology', 'regional_and_international_integration',
    'rural_and_urban_development',
  ]).optional(),
  institutional_goal: z.string().optional(),
}).refine(
  (data) => data.nds2_pillar || data.institutional_goal,
  { message: 'At least one of NDS2 Pillar or Institutional Goal is required.', path: ['nds2_pillar'] }
)
```

**Numeric coercion pattern** (D-30 — `z.coerce.number()` for form string-to-number):
```typescript
export const kpiSchema = z.object({
  objective_id:         z.string().uuid('Please select a linked objective.'),
  title:                z.string().min(1, 'KPI title is required.'),
  description:          z.string().optional(),
  owner_id:             z.string().uuid('Please select a valid owner.'),
  baseline_value:       z.coerce.number({ invalid_type_error: 'Baseline must be a number.' }),
  target_value:         z.coerce.number({ invalid_type_error: 'Target must be a number.' }),
  unit_of_measure:      z.string().min(1, 'Unit of measure is required.'),
  reporting_frequency:  z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
})

export const kpiReadingSchema = z.object({
  reporting_period: z.string().min(1, 'Reporting period is required.'),
  actual_value:     z.coerce.number({ invalid_type_error: 'Actual value must be a number.' }),
  notes:            z.string().optional(),
})
```

**Type export pattern** (lines 47-50 of auth.ts — always export inferred types):
```typescript
export type ObjectiveInput = z.infer<typeof objectiveSchema>
export type KpiInput = z.infer<typeof kpiSchema>
export type KpiReadingInput = z.infer<typeof kpiReadingSchema>
```

**Rules:**
- Zod v3.x hard constraint — no v4 APIs
- `z.coerce.number()` is the correct pattern for numeric form fields (HTML inputs return strings)
- Export inferred types alongside every schema (used by react-hook-form generics)
- Error messages follow sentence case with period: `'Objective title is required.'`
- Cross-field validation (NDS2 pillar OR institutional goal) uses `.refine()` with `path` pointing to the first relevant field

---

### `lib/strategic/actions.ts` (server action, CRUD)

**Analog:** `lib/auth/actions.ts` + `lib/auth/admin-actions.ts`

**File header + directive** (lines 1-13 of auth/actions.ts):
```typescript
'use server'
// lib/strategic/actions.ts
// Server Actions for strategic planning CRUD.
// SECURITY: All actions validate input with Zod before any Supabase calls.
// SECURITY: Role check via user.app_metadata.active_role (JWT claim — no DB query).

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { objectiveSchema, kpiSchema, kpiReadingSchema } from '@/lib/schemas/strategic'
import type { ObjectiveInput, KpiInput, KpiReadingInput } from '@/lib/schemas/strategic'
```

**Role-check + Zod-first pattern** (lines 16-25 of auth/actions.ts + lines 16-24 of admin-actions.ts):
```typescript
export async function createObjective(values: ObjectiveInput) {
  // 1. Zod parse — server is the trust boundary even when client already validated
  const parsed = objectiveSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // 2. Get authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  // 3. Role check via JWT claim — NO DB query (D-07: admin and ceo only)
  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role
  if (!['admin', 'ceo'].includes(activeRole)) {
    return { error: 'You do not have permission to create objectives.' }
  }

  const institutionId = appMeta?.institution_id

  // 4. Supabase insert
  try {
    const { data, error } = await supabase
      .from('strategic_objectives')
      .insert({
        ...parsed.data,
        institution_id: institutionId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // 5. Revalidate the objectives list page
    revalidatePath('/strategic/objectives')
    return { data }
  } catch (err) {
    // Log internally; return generic message to client (never expose stack traces)
    console.error('[createObjective]', err)
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
  // redirect() goes HERE — outside try/catch (Next.js redirect() throws NextRedirect)
}
```

**Update action pattern** (shows SECURITY: only owner-institution rows, using RLS as second layer):
```typescript
export async function updateObjective(id: string, values: ObjectiveInput) {
  const parsed = objectiveSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const appMeta = user.app_metadata as Record<string, string>
  if (!['admin', 'ceo'].includes(appMeta?.active_role)) {
    return { error: 'Unauthorized.' }
  }

  try {
    const { error } = await supabase
      .from('strategic_objectives')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      // RLS enforces institution_id isolation — no manual institution filter needed here,
      // but adding it is acceptable defense-in-depth

    if (error) throw error

    revalidatePath('/strategic/objectives')
    revalidatePath(`/strategic/objectives/${id}`)
    return { data: { id } }
  } catch (err) {
    console.error('[updateObjective]', err)
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
}
```

**KPI reading action — owner-or-admin check** (D-13):
```typescript
export async function recordKpiReading(kpiId: string, values: KpiReadingInput) {
  const parsed = kpiReadingSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role
  const institutionId = appMeta?.institution_id

  // Fetch KPI to verify ownership
  const { data: kpi } = await supabase
    .from('kpis')
    .select('owner_id, institution_id')
    .eq('id', kpiId)
    .single()

  if (!kpi) return { error: 'KPI not found.' }

  // Owner or admin can record readings (D-13)
  const isOwner = kpi.owner_id === user.id
  const isAdmin = activeRole === 'admin'
  if (!isOwner && !isAdmin) {
    return { error: 'Only the KPI owner or an administrator can record readings.' }
  }

  try {
    const { data, error } = await supabase
      .from('kpi_readings')
      .insert({
        kpi_id: kpiId,
        institution_id: institutionId,
        reporting_period: parsed.data.reporting_period,
        actual_value: parsed.data.actual_value,
        notes: parsed.data.notes ?? null,
        recorded_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/strategic/kpis/${kpiId}`)
    revalidatePath('/strategic')
    return { data }
  } catch (err) {
    console.error('[recordKpiReading]', err)
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
}
```

**Rules (from auth/actions.ts and admin-actions.ts):**
- `'use server'` at top of file (not per-function)
- Zod `safeParse()` always first — never `parse()` (which throws)
- Role check via `user.app_metadata` — never a DB query (JWT claims are fast and don't count against RLS)
- `revalidatePath()` after every mutation so the list page reflects changes
- `redirect()` outside try/catch — it throws `NextRedirect` internally and must not be caught
- Return `{ error: string }` for failures, `{ data: T }` for success — never throw to client
- Generic error message for unexpected failures — never expose internal error details

---

### `lib/strategic/kpi-utils.ts` (utility, transform)

**Analog:** `lib/auth/recovery-codes.ts` (pure function utility pattern)

**Pure utility module pattern** (recovery-codes.ts is a good structural reference — no Supabase, no auth, just pure business logic):
```typescript
// lib/strategic/kpi-utils.ts
// Pure functions for KPI performance status calculation.
// Thresholds are hardcoded constants per D-16 — not configurable per institution in Phase 2.

// D-14 thresholds
export const KPI_ON_TRACK_THRESHOLD = 0.90   // actual >= 90% of target
export const KPI_AT_RISK_THRESHOLD  = 0.70   // actual >= 70% and < 90% of target

export type KpiStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data'

export function calculateKpiStatus(
  actualValue: number | null | undefined,
  targetValue: number
): KpiStatus {
  if (actualValue === null || actualValue === undefined) return 'no_data'
  const ratio = actualValue / targetValue
  if (ratio >= KPI_ON_TRACK_THRESHOLD) return 'on_track'
  if (ratio >= KPI_AT_RISK_THRESHOLD) return 'at_risk'
  return 'off_track'
}

// D-19 badge color mapping to Tailwind tokens
export const KPI_STATUS_BADGE: Record<KpiStatus, { label: string; className: string }> = {
  on_track:  { label: 'On Track',  className: 'bg-ok/10 text-ok border-ok/30' },
  at_risk:   { label: 'At Risk',   className: 'bg-warn/10 text-warn border-warn/30' },
  off_track: { label: 'Off Track', className: 'bg-err/10 text-err border-err/30' },
  no_data:   { label: 'No Data',   className: 'bg-paper text-navy-mid border-paper-border' },
}
```

**Rules:**
- Pure functions only — no Supabase imports, no Next.js imports
- Export constants so they can be documented and referenced from tests
- Can be imported in both Server Components (for server-side calculation) and Client Components (for badge rendering)

---

### `types/strategic.ts` (type definition)

**Analog:** `types/auth.ts`

**Type definition file pattern** (full auth.ts — lines 1-33):
```typescript
// types/strategic.ts
// TypeScript types for the Strategic Planning module.

export type ObjectiveStatus = 'draft' | 'active' | 'at_risk' | 'completed' | 'cancelled'

export type KpiFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export type Nds2Pillar =
  | 'economic_transformation'
  | 'social_development'
  | 'infrastructure_development'
  | 'environmental_sustainability'
  | 'governance_and_institutions'
  | 'innovation_and_technology'
  | 'regional_and_international_integration'
  | 'rural_and_urban_development'

// DB row shape for strategic_objectives (mirrors table columns)
export interface StrategicObjective {
  id: string
  institution_id: string
  title: string
  description: string | null
  owner_id: string | null
  start_date: string | null
  target_date: string | null
  status: ObjectiveStatus
  nds2_pillar: Nds2Pillar | null
  institutional_goal: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// NDS2 pillar display labels (same pattern as ROLE_DESCRIPTIONS in types/auth.ts)
export const NDS2_PILLAR_LABELS: Record<Nds2Pillar, string> = {
  economic_transformation: 'Economic Transformation',
  social_development: 'Social Development',
  // ... etc
}
```

**Rules:**
- Mirror Postgres column names exactly in interface field names (snake_case)
- String union types for enums (not TypeScript `enum` keyword — keeps serialization simple)
- Export display label maps as `const` records (same pattern as `ROLE_DESCRIPTIONS` in auth.ts)

---

### `app/(protected)/strategic/layout.tsx` (layout, request-response)

**Analog:** `app/(protected)/admin/layout.tsx`

**Role-gated section layout pattern** (full admin/layout.tsx — 24 lines):
```typescript
// app/(protected)/strategic/layout.tsx
// Strategic Planning section layout — verifies active_role is one of the allowed roles.
// All roles can VIEW strategic data (D-23), so only unauthenticated users are redirected.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'

const STRATEGIC_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member', 'dept-head']

export default async function StrategicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !STRATEGIC_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
```

**Rules (from admin/layout.tsx):**
- `export const dynamic = 'force-dynamic'` on all protected section layouts — prevents ISR from caching auth state
- Use `user.app_metadata` — NOT `user.user_metadata` (users can write user_metadata; app_metadata is server-controlled)
- Pattern: check user exists → check role → render children (no wrapping div needed; parent layout provides the shell)

---

### `app/(protected)/strategic/page.tsx` (page, Server Component, CRUD)

**Analog:** `app/(protected)/admin/audit-log/page.tsx`

**Server Component page with URL param parsing + data fetch + client component delegation** (full audit-log/page.tsx pattern):

**Page shell pattern** (lines 1-19 of audit-log/page.tsx):
```typescript
// app/(protected)/strategic/page.tsx
// KPI summary dashboard — all institution KPIs in a filterable grid.
// SECURITY: force-dynamic prevents ISR caching of KPI data.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiGrid } from './KpiGrid'
import { KpiFilterBar } from './KpiFilterBar'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Strategic KPIs — GRC-Nexus',
}
```

**Role check + data fetch pattern** (lines 21-72 of audit-log/page.tsx):
```typescript
const ALLOWED_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member', 'dept-head']

export default async function StrategicPage({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, unknown>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !ALLOWED_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  // Parse filter params from URL (same pattern as audit-log page)
  const statusFilter = searchParams.status ?? ''
  const objectiveFilter = searchParams.objective ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const PAGE_SIZE = 20  // D-21: 20 rows per page

  // Fetch KPIs with latest reading (using a subquery or separate fetch + join in application layer)
  const { data: kpis, count } = await supabase
    .from('kpis')
    .select(`
      id, title, description, owner_id, baseline_value, target_value,
      unit_of_measure, reporting_frequency, objective_id,
      strategic_objectives ( id, title ),
      kpi_readings ( actual_value, reporting_period, recorded_at )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900 font-body">Strategic KPIs</h1>
          <p className="text-[14px] text-navy-mid mt-1">
            Institution KPI performance dashboard — {(count ?? 0).toLocaleString()} KPIs
          </p>
        </div>
      </div>
      <KpiFilterBar />
      <KpiGrid kpis={kpis ?? []} totalCount={count ?? 0} page={page} pageSize={PAGE_SIZE} />
    </div>
  )
}
```

**Page header layout token** (from dashboard/page.tsx lines 44-47 and users/page.tsx lines 44-52):
```typescript
// Header section — exact token pattern used across all protected pages:
<div className="flex items-center justify-between mb-6 flex-wrap gap-4">
  <div>
    <h1 className="text-[20px] font-semibold text-navy-900 font-body">Page Title</h1>
    <p className="text-[14px] text-navy-mid mt-1">Subtitle text</p>
  </div>
  {/* Optional action button on the right */}
</div>
```

---

### `app/(protected)/strategic/KpiGrid.tsx` (component, Client Component, CRUD)

**Analog:** `app/(protected)/admin/audit-log/AuditLogTable.tsx`

**Client Component table pattern** (lines 1-6 of AuditLogTable.tsx — exact imports to copy):
```typescript
'use client'
// app/(protected)/strategic/KpiGrid.tsx
// KPI summary grid per D-17 to D-21: status badges, trend sparklines, 20 rows/page.
import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { KpiSparkline } from './KpiSparkline'
import { calculateKpiStatus, KPI_STATUS_BADGE } from '@/lib/strategic/kpi-utils'
```

**Type definition at top of component file** (lines 13-26 of AuditLogTable.tsx — local type, not imported):
```typescript
type KpiRow = {
  id: string
  title: string
  objective_id: string
  owner_id: string | null
  target_value: number
  unit_of_measure: string
  reporting_frequency: string
  strategic_objectives: { id: string; title: string } | null
  kpi_readings: { actual_value: number; reporting_period: string; recorded_at: string }[]
}
```

**Table shell pattern** (lines 68-69 of AuditLogTable.tsx — the wrapping div is identical across all tables):
```typescript
<div className="bg-white rounded-[10px] border border-paper-border shadow-card overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="bg-paper border-b border-paper-border">
        {/* Column headers — text-[12px] font-semibold uppercase tracking-wider text-navy-mid */}
        <th className="text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">
          KPI Title
        </th>
        {/* ... other columns per D-18 */}
      </tr>
    </thead>
    <tbody className="divide-y divide-paper-border">
      {/* rows */}
    </tbody>
  </table>

  {/* Pagination footer — identical pattern to AuditLogTable lines 204-229 */}
  <div className="px-4 py-3 border-t border-paper-border bg-paper flex items-center justify-between">
    <span className="text-[13px] text-navy-mid">
      Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–
      {Math.min(page * pageSize, totalCount)} of {totalCount} KPIs
    </span>
    {/* prev/next links */}
  </div>
</div>
```

**Badge rendering pattern** (lines 139-147 of AuditLogTable.tsx — copy exactly):
```typescript
// In each table row — status badge from kpi-utils:
const status = calculateKpiStatus(latestReading?.actual_value ?? null, kpi.target_value)
const badgeInfo = KPI_STATUS_BADGE[status]

<Badge className={`text-[11px] font-semibold border w-fit ${badgeInfo.className}`}>
  {badgeInfo.label}
</Badge>
```

**Empty state pattern** (lines 57-63 of AuditLogTable.tsx):
```typescript
if (kpis.length === 0) {
  return (
    <div className="bg-white rounded-[10px] border border-paper-border shadow-card">
      <div className="py-20 text-center text-navy-mid text-[14px]">
        No KPIs found. {/* Or: "No KPIs yet — create the first one." with a link */}
      </div>
    </div>
  )
}
```

**Rules:**
- Named export (`export function KpiGrid`) — not default export (Phase 1 convention from admin-actions.ts and all component files)
- Props interface typed explicitly: `interface KpiGridProps { kpis: KpiRow[]; totalCount: number; page: number; pageSize: number }`
- Pagination via plain `<a href>` links (same as AuditLogTable lines 215-228) — NOT `useRouter` push (consistent with existing pattern)
- `format(new Date(date), 'yyyy-MM-dd')` for all date display (date-fns, consistent with UserManagementTable line 229 and AuditLogTable line 112)

---

### `app/(protected)/strategic/KpiFilterBar.tsx` (component, Client Component)

**Analog:** `app/(protected)/admin/audit-log/FilterBar.tsx`

**URL-based filter pattern** (lines 1-10 of FilterBar.tsx — exact import shape):
```typescript
'use client'
// app/(protected)/strategic/KpiFilterBar.tsx
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
```

**Filter state + URL push pattern** (lines 22-50 of FilterBar.tsx):
```typescript
export function KpiFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all')
  const [objectiveFilter, setObjectiveFilter] = useState(searchParams.get('objective') ?? 'all')

  function handleApply() {
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    if (objectiveFilter && objectiveFilter !== 'all') params.set('objective', objectiveFilter)
    params.set('page', '1')   // always reset to page 1 on filter change
    router.push(`/strategic?${params.toString()}`)
  }

  function handleClear() {
    setStatusFilter('all')
    setObjectiveFilter('all')
    router.push('/strategic')
  }
  // ...
}
```

**Filter layout pattern** (lines 52-138 of FilterBar.tsx — label above each filter):
```typescript
// Each filter wrapped in a div with a label above:
<div>
  <label className="text-[12px] font-medium text-navy-mid block mb-1">Status</label>
  <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-[160px] h-9 border-paper-border text-[13px]">
      <SelectValue placeholder="All statuses" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All statuses</SelectItem>
      <SelectItem value="on_track">On Track</SelectItem>
      <SelectItem value="at_risk">At Risk</SelectItem>
      <SelectItem value="off_track">Off Track</SelectItem>
      <SelectItem value="no_data">No Data</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Apply/Clear button pattern** (lines 122-138 of FilterBar.tsx):
```typescript
<div className="flex gap-2 mt-5">
  <Button
    size="sm"
    className="h-9 bg-gold text-navy-950 hover:bg-gold-hi text-[13px] px-4"
    onClick={handleApply}
  >
    Apply filters
  </Button>
  <Button
    size="sm"
    variant="outline"
    className="h-9 border-paper-border text-[13px]"
    onClick={handleClear}
  >
    Clear
  </Button>
</div>
```

---

### `app/(protected)/strategic/KpiSparkline.tsx` (component, Client Component)

**Analog:** None in codebase — this is the first Recharts component.

**Convention to establish** (based on CONTEXT.md D-20 and stack decisions):
```typescript
'use client'
// app/(protected)/strategic/KpiSparkline.tsx
// Mini line chart — no axes, no labels, no tooltip.
// Shows up to last 6 readings for trend visualization (D-20).
// Uses Recharts LineChart (already in stack per CONTEXT.md D-20).
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  readings: { actual_value: number; reporting_period: string }[]
  status: 'on_track' | 'at_risk' | 'off_track' | 'no_data'
}

// Color mapping to Tailwind token hex values (Recharts uses hex, not class names)
const SPARKLINE_COLOR: Record<SparklineProps['status'], string> = {
  on_track:  '#27AE60',   // --color-ok
  at_risk:   '#E67E22',   // --color-warn
  off_track: '#E74C3C',   // --color-err
  no_data:   '#D7E2EF',   // --color-paper-border
}

export function KpiSparkline({ readings, status }: SparklineProps) {
  // Take last 6 readings, sorted oldest-first for left-to-right trend
  const data = readings
    .slice(-6)
    .map((r) => ({ value: r.actual_value }))

  if (data.length === 0) {
    return <div className="w-[80px] h-[32px] bg-paper rounded" />  // empty placeholder
  }

  return (
    <div className="w-[80px] h-[32px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={SPARKLINE_COLOR[status]}
            strokeWidth={1.5}
            dot={false}          // no dots — keep it micro
            isAnimationActive={false}  // no animation in table cells
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

**Rules (established for Phase 2 — no prior analog):**
- `isAnimationActive={false}` — mandatory in table cells to prevent layout jank during re-render
- `dot={false}` — micro chart; dots clutter the 80×32px canvas
- No tooltip, no axes, no labels — sparkline only
- Color values are hex literals matching Tailwind token definitions in `tailwind.config.ts`
- `ResponsiveContainer` wraps `LineChart` always — never hardcode pixel dimensions on `LineChart` itself
- Component lives in the same directory as the grid that consumes it (`app/(protected)/strategic/`)

---

### `app/(protected)/strategic/objectives/page.tsx` (page, Server Component, CRUD)

**Analog:** `app/(protected)/admin/users/page.tsx`

**Server Component list page pattern** (full users/page.tsx — 62 lines):
```typescript
// app/(protected)/strategic/objectives/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ObjectivesTable } from './ObjectivesTable'
import type { AppRole } from '@/types/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Strategic Objectives — GRC-Nexus',
}

const CREATE_ROLES: AppRole[] = ['admin', 'ceo']

export default async function ObjectivesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  const { data: objectives } = await supabase
    .from('strategic_objectives')
    .select('id, title, status, nds2_pillar, institutional_goal, owner_id, target_date, created_at')
    .order('created_at', { ascending: false })

  const canCreate = activeRole ? CREATE_ROLES.includes(activeRole) : false

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900 font-body">Strategic Objectives</h1>
          <p className="text-[14px] text-navy-mid mt-1">
            NDS2-aligned and institutional strategic objectives
          </p>
        </div>
        {canCreate && (
          <Link
            href="/strategic/objectives/new"
            className="inline-flex items-center px-4 py-2 rounded-[8px] bg-gold text-navy-950 hover:bg-gold-hi text-[13px] font-medium shadow-card transition-colors"
          >
            New Objective
          </Link>
        )}
      </div>
      <ObjectivesTable objectives={objectives ?? []} activeRole={activeRole} />
    </div>
  )
}
```

---

### `app/(protected)/strategic/objectives/ObjectivesTable.tsx` (component, Client Component, CRUD)

**Analog:** `app/(protected)/admin/users/UserManagementTable.tsx`

**Full Client Component table with filters and actions** (UserManagementTable.tsx — 372 lines):

**Import block pattern** (lines 1-29 of UserManagementTable.tsx):
```typescript
'use client'
import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { updateObjectiveStatus } from '@/lib/strategic/actions'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
```

**Status badge map pattern** (lines 42-46 of UserManagementTable.tsx):
```typescript
const OBJECTIVE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-paper text-navy-mid border-paper-border' },
  active:    { label: 'Active',    className: 'bg-green-100 text-green-800 border-green-300/40' },
  at_risk:   { label: 'At Risk',   className: 'bg-warn/10 text-warn border-warn/30' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800 border-blue-300/40' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-300' },
}
```

**Client-side filter pattern** (lines 68-74 of UserManagementTable.tsx):
```typescript
const filtered = objectives.filter((obj) => {
  const text = `${obj.title} ${obj.institutional_goal ?? ''}`.toLowerCase()
  if (search && !text.includes(search.toLowerCase())) return false
  if (statusFilter !== 'all' && obj.status !== statusFilter) return false
  return true
})
```

**Action with useTransition pattern** (lines 76-90 of UserManagementTable.tsx):
```typescript
const [isPending, startTransition] = useTransition()

function handleStatusChange(id: string, newStatus: string) {
  startTransition(async () => {
    const result = await updateObjectiveStatus(id, newStatus)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Objective status updated.')
    }
  })
}
```

**Table wrapper + header row** (lines 163-173 of UserManagementTable.tsx):
```typescript
<div className="bg-white rounded-[10px] border border-paper-border shadow-card overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow className="bg-paper">
        <TableHead className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid">
          Title
        </TableHead>
        {/* ... */}
      </TableRow>
    </TableHeader>
    <TableBody>
      {/* rows */}
    </TableBody>
  </Table>
</div>
```

**Dialog confirmation pattern** (lines 321-344 of UserManagementTable.tsx — use for cancel/delete objective):
```typescript
<Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Cancel this objective?</DialogTitle>
      <DialogDescription>
        This will mark <strong>{cancelDialog?.title}</strong> as cancelled.
        This action can be undone by setting the status back to Active.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setCancelDialog(null)}>Keep Active</Button>
      <Button variant="destructive" disabled={isPending}
        onClick={() => cancelDialog && handleStatusChange(cancelDialog.id, 'cancelled')}>
        Cancel Objective
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### `app/(protected)/strategic/objectives/new/ObjectiveForm.tsx` (component, Client Component)

**Analog:** `app/(auth)/register/RegisterForm.tsx`

**Form component shell** (lines 1-60 of RegisterForm.tsx — exact structure to copy):
```typescript
'use client'
// ObjectiveForm.tsx — Client Component
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { objectiveSchema, type ObjectiveInput } from '@/lib/schemas/strategic'
import { createObjective } from '@/lib/strategic/actions'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
```

**Form initialization + onSubmit pattern** (lines 36-59 of RegisterForm.tsx):
```typescript
export function ObjectiveForm({ owners }: { owners: { id: string; name: string }[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ObjectiveInput>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: { title: '', description: '', status: 'draft' },
    mode: 'onBlur',   // validate on blur — NOT onChange (UI-SPEC Interaction Contract)
  })

  function onSubmit(values: ObjectiveInput) {
    setError(null)
    startTransition(async () => {
      const result = await createObjective(values)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/strategic/objectives')
      }
    })
  }
```

**Form layout pattern** (lines 61-263 of RegisterForm.tsx):
```typescript
  return (
    <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-8 max-w-2xl">
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Objective Title</FormLabel>
                <FormControl>
                  <Input className="h-11 border-paper-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* ... additional fields */}
          <Button
            type="submit"
            className="mt-6 h-11 bg-gold text-navy-950 hover:bg-gold-hi font-semibold text-[14px] px-8"
            disabled={isPending}
            aria-disabled={isPending}
            aria-busy={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Create Objective
          </Button>
        </form>
      </Form>
    </div>
  )
}
```

**Select field pattern** (from UserManagementTable.tsx lines 138-158 — same Select component):
```typescript
<FormField
  control={form.control}
  name="nds2_pillar"
  render={({ field }) => (
    <FormItem className="mt-4">
      <FormLabel className="text-[14px] font-medium text-navy-900">NDS2 Pillar</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger className="h-11 border-paper-border">
            <SelectValue placeholder="Select a pillar (optional)" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="economic_transformation">Economic Transformation</SelectItem>
          {/* ... other pillars from NDS2_PILLAR_LABELS */}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

### `app/(protected)/strategic/kpis/[id]/readings/new/ReadingForm.tsx` (component, Client Component)

**Analog:** `app/(auth)/register/RegisterForm.tsx` (simplest form — fewest fields)

**Simple 3-field form** — this is the simplest form in Phase 2 (reporting period, actual value, notes):
```typescript
'use client'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { kpiReadingSchema, type KpiReadingInput } from '@/lib/schemas/strategic'
import { recordKpiReading } from '@/lib/strategic/actions'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export function ReadingForm({ kpiId, frequency }: { kpiId: string; frequency: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<KpiReadingInput>({
    resolver: zodResolver(kpiReadingSchema),
    defaultValues: { reporting_period: '', actual_value: 0, notes: '' },
    mode: 'onBlur',
  })

  function onSubmit(values: KpiReadingInput) {
    setError(null)
    startTransition(async () => {
      const result = await recordKpiReading(kpiId, values)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push(`/strategic/kpis/${kpiId}`)
      }
    })
  }
  // Form JSX — same shell as ObjectiveForm
}
```

**Period format helper text pattern** (surface the ISO-period format examples from D-12):
```typescript
// Below the reporting_period input — helper text showing expected format
<p className="text-[13px] text-navy-mid mt-1">
  {frequency === 'monthly' && 'Format: YYYY-M## (e.g. 2026-M03)'}
  {frequency === 'quarterly' && 'Format: YYYY-Q# (e.g. 2026-Q1)'}
  {frequency === 'semi_annual' && 'Format: YYYY-H# (e.g. 2026-H1)'}
  {frequency === 'annual' && 'Format: YYYY (e.g. 2026)'}
</p>
```

---

## Shared Patterns

### Authentication Guard
**Source:** `app/(protected)/admin/users/page.tsx` lines 4-9 and `app/(protected)/admin/audit-log/page.tsx` lines 27-30
**Apply to:** All Server Component pages in `app/(protected)/strategic/`
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```
Do NOT use `getSession()` — it does not validate the JWT (Phase 1 anti-pattern, confirmed critical).

---

### Role Check via JWT Claims
**Source:** `app/(protected)/admin/layout.tsx` lines 18-20, `lib/auth/admin-actions.ts` lines 21-24
**Apply to:** Every Server Action in `lib/strategic/actions.ts` + every page with role-gated actions
```typescript
const appMeta = user.app_metadata as Record<string, string>
const activeRole = appMeta?.active_role as AppRole | undefined
// NEVER: const { data } = await supabase.from('user_profiles').select('active_role')
// ALWAYS: JWT claim — zero DB round-trips, cached in cookie
```

---

### Server Action Return Contract
**Source:** `lib/auth/actions.ts` lines 15-30, `lib/auth/admin-actions.ts` lines 16-45
**Apply to:** All functions in `lib/strategic/actions.ts`
```typescript
// Success: { data: T }
// Failure: { error: string }   ← user-facing message, never internal details
// Navigation: redirect('/path')  ← outside try/catch, NEVER inside
```

---

### revalidatePath After Every Mutation
**Source:** `lib/auth/admin-actions.ts` (uses `revalidatePath` from next/cache)
**Apply to:** All write actions in `lib/strategic/actions.ts`
```typescript
import { revalidatePath } from 'next/cache'
// After every insert/update/delete:
revalidatePath('/strategic/objectives')          // list page
revalidatePath(`/strategic/objectives/${id}`)   // detail page (for updates)
revalidatePath('/strategic')                     // KPI dashboard
```

---

### Toast Notifications for Action Results
**Source:** `app/(protected)/admin/users/UserManagementTable.tsx` lines 77-88 (uses `sonner`)
**Apply to:** All Client Components that call Server Actions
```typescript
import { toast } from 'sonner'
// On success: toast.success('Objective created.')
// On error:   toast.error(result.error)
// On neutral: toast.info('Objective cancelled.')
```

---

### force-dynamic on All Protected Pages
**Source:** `app/(protected)/admin/users/page.tsx` line 8, `app/(protected)/admin/audit-log/page.tsx` line 6
**Apply to:** All `page.tsx` files under `app/(protected)/strategic/`
```typescript
export const dynamic = 'force-dynamic'
```
This prevents ISR from caching authenticated page responses — critical for data freshness.

---

### Tailwind Design Tokens (No New Tokens Needed)
**Source:** `tailwind.config.ts` lines 13-24
**Apply to:** All new components

All tokens needed for Phase 2 already exist:
| Purpose | Token | Hex |
|---|---|---|
| On Track badge | `text-ok`, `bg-ok/10`, `border-ok/30` | `#27AE60` |
| At Risk badge | `text-warn`, `bg-warn/10`, `border-warn/30` | `#E67E22` |
| Off Track badge | `text-err`, `bg-err/10`, `border-err/30` | `#E74C3C` |
| No Data badge | `text-navy-mid`, `bg-paper`, `border-paper-border` | existing |
| Card shell | `bg-white rounded-[10px] border border-paper-border shadow-card` | existing |
| Page background | `bg-paper` | `#F3F7FD` |
| Header text | `text-navy-900` | `#0B1625` |
| Subtext | `text-navy-mid` | `#3A5270` |
| Primary action button | `bg-gold text-navy-950 hover:bg-gold-hi` | `#C8A44A` |

No additions to `tailwind.config.ts` required for Phase 2.

---

### Naming Conventions (Confirmed from Phase 1 Codebase)

| Item | Convention | Example |
|---|---|---|
| Page files | `page.tsx` (always) | `app/(protected)/strategic/page.tsx` |
| Layout files | `layout.tsx` (always) | `app/(protected)/strategic/layout.tsx` |
| Client Components | `PascalCase.tsx` | `KpiGrid.tsx`, `ObjectiveForm.tsx` |
| Server utilities / actions | `camelCase.ts` | `actions.ts`, `kpi-utils.ts` |
| Schemas | `camelCase.ts` in `lib/schemas/` | `lib/schemas/strategic.ts` |
| Route segments | `kebab-case` | `/strategic/objectives/new`, `/kpis/[id]/readings/new` |
| Migration files | `YYYYMMDD######_description.sql` | `20260522000007_strategic_schema.sql` |
| DB indexes | `idx_{table}_{column}` | `idx_kpis_objective_id` |
| RLS policies | `{table}_{verb}` | `strategic_objectives_select` |
| Component exports | Named exports (not default) | `export function KpiGrid` |
| Page exports | Default exports (Next.js requirement) | `export default function StrategicPage` |

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/(protected)/strategic/KpiSparkline.tsx` | component | transform | First Recharts component in codebase — pattern established above as the new project convention |

---

## Anti-Patterns to Avoid

Derived from Phase 1 code + CONTEXT.md pitfall notes:

| Anti-Pattern | Correct Pattern | Source |
|---|---|---|
| `supabase.auth.getSession()` in server context | `supabase.auth.getUser()` always | `lib/supabase/server.ts` comment |
| DB query to get active_role: `supabase.from('user_profiles').select('active_role')` | `user.app_metadata.active_role` from JWT | `lib/auth/admin-actions.ts` lines 21-24 |
| `user.user_metadata` for roles/institution | `user.app_metadata` only | `app/(protected)/layout.tsx` comment |
| Inline RLS helper call: `using (institution_id = auth.institution_id())` | Always `(select auth.institution_id())` wrapper | `20260522000002_rls_policies.sql` comment |
| `redirect()` inside `try/catch` | `redirect()` after the try/catch block | `lib/auth/actions.ts` comment line 7 |
| `SECURITY DEFINER` without `set search_path = ''` | Always add `set search_path = ''` | `20260522000003_audit_triggers.sql` line 26 |
| Editing Phase 1 migrations for new enums | Create new migration `20260522000007_...` | CONTEXT.md code_context section |
| `isAnimationActive` default (true) on Recharts in table cells | `isAnimationActive={false}` always in table cells | Established above (new convention) |
| Default export for components | Named exports for all components | Phase 1 component files |
| `z.number()` for numeric form fields | `z.coerce.number()` — HTML inputs are always strings | CONTEXT.md D-30 |

---

## Metadata

**Analog search scope:** Full `app/`, `lib/`, `supabase/migrations/`, `types/`, `tailwind.config.ts`
**Files scanned:** 24 source files read (all Phase 1 built files)
**Pattern extraction date:** 2026-05-22
