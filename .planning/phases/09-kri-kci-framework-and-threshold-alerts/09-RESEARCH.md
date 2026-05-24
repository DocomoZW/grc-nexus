# Phase 9: KRI/KCI Framework and Threshold Alerts - Research

**Researched:** 2026-05-25
**Domain:** Indicator framework (KRI/KCI) + value-threshold alert service — pure Next.js 14 App Router + Supabase, no new dependencies
**Confidence:** HIGH — all findings verified directly from the existing codebase; no external lookups required

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Data Model**
- `kri_definitions`: optional `risk_id` FK (KRI can be standalone or linked to a risk) — mirrors `kpis → strategic_objectives` pattern
- `kci_definitions`: `treatment_id` FK linking to `risk_treatments` (existing control-analog; no new controls table)
- Separate tables for KRI and KCI (not a unified `indicator_definitions` table) — clearer semantics, simpler validation
- Readings tables mirror `kpi_readings` exactly: `period_start`, `period_end`, `actual_value`, `status enum (on_track/at_risk/breached/no_data)`, `notes`
- All new tables: RLS (institution_id scoped), audit triggers via `audit.attach_audit_trigger()`

**Threshold Alert Semantics**
- Absolute value thresholds: `alert_threshold` field on definition; user sets "alert if actual < 85"
- `direction` enum on definition: `lower_is_worse` vs `higher_is_worse` (configurable per indicator)
- Daily cron cadence (matches existing compliance/audit escalation pattern; CRON_SECRET protected)
- Alert recipients: KRI/KCI owner + all institution governance officers (matches compliance escalation pattern)
- Alert service path: `lib/risk/kri-alert.ts`, `lib/audit/kci-alert.ts`; API routes: `app/api/kri/alert/route.ts`, `app/api/kci/alert/route.ts`

**Dashboard Integration**
- KRI stat card on executive dashboard: 3 counts (on_track / at_risk / breached) using existing status color tokens
- KCI health grid on executive dashboard: % controls green + count breached
- KRI/KCI detail pages show Recharts sparkline trend — reuse `KpiSparkline` with generic props (or thin wrapper)
- Executive dashboard additions are additive stat cards, not layout changes

**Navigation & UX**
- KRI definitions: `/risk/kris` (sub-section under Risk module, colocated with heatmap/register)
- KCI definitions: `/audit/kcis` (sub-section under Audit module — KCIs measure control effectiveness)
- Reading entry: KRI/KCI detail page → "Record Reading" button → dedicated form page — mirrors `/strategic/kpis/[id]/readings/new`
- Sidebar nav: add "KRIs" link under Risk section, "KCIs" link under Audit section

### Claude's Discretion
- Migration numbering: continue from `20260524000008` → start at `20260525000001`
- Status enum values: `on_track | at_risk | breached | no_data` (adds `breached` to match threshold semantics beyond KPI's `off_track`)
- Zod schemas follow existing `numericField()` preprocess pattern from Phase 2

### Deferred Ideas (OUT OF SCOPE)
- New standalone `controls` table (independent of risk_treatments) — Phase 10 may revisit
- Combined KRI/KCI cross-module view — deferred to Phase 11 traceability graph
- Percentage-deviation threshold mode — can be added post-Phase 9
- KRI/KCI benchmarking across institutions — deferred to multi-tenant milestone
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRIDGE-KRI-01 | Risk officer can define a KRI linked to a risk with metric name, unit, target value, alert threshold, direction, and owner | `kri_definitions` table + `createKriDefinition` action mirroring `createKpi`; `direction` enum on definition |
| BRIDGE-KRI-02 | Risk officer can record KRI period readings without overwriting prior readings | `kri_readings` table (append-only insert like `kpi_readings`); `recordKriReading` action |
| BRIDGE-KRI-03 | KRI readings are immutably recorded via Postgres audit triggers | `audit.attach_audit_trigger('kri_readings')` in triggers migration; no UPDATE RLS policy on readings |
| BRIDGE-KCI-01 | Audit officer can define a KCI linked to a control (risk_treatment) with metric name, unit, target value, alert threshold, and test cadence | `kci_definitions` table with `treatment_id` FK; `createKciDefinition` action mirroring risk module pattern |
| BRIDGE-KCI-02 | Audit officer can record KCI readings per scheduled test cycle | `kci_readings` table + `recordKciReading` action |
| BRIDGE-KCI-03 | KRI/KCI executive dashboard tiles — KRI status tile (on_track/at_risk/breached counts) and KCI health grid (% green) | Query aggregations in `getExecutiveDashboardData` or separate helper; additive `KpiSummaryCard` / `ComplianceStatCard` tiles |
| BRIDGE-ALERT-01 | System fires threshold-breach email alerts to KRI/KCI owner and governance officer when actual value crosses alert threshold | `lib/risk/kri-alert.ts` + `lib/audit/kci-alert.ts`; direction-aware breach logic; Resend via `createAdminClient` pattern |
| BRIDGE-ALERT-02 | Cron-protected API routes for daily alert sweep | `app/api/kri/alert/route.ts` + `app/api/kci/alert/route.ts`; CRON_SECRET guard mirrors `app/api/compliance/escalate/route.ts` exactly |
</phase_requirements>

---

## Summary

Phase 9 introduces KRI and KCI definitions + readings tables and a value-threshold alert service. The entire implementation is a direct extension of patterns already proven across three prior phases: the KPI pattern (Phase 2), the risk/treatment data model (Phase 3), and the compliance escalation service (Phase 4). No new dependencies, no new libraries — the planner's job is to correctly wire together these three proven patterns.

The most novel engineering concern is the **direction-aware threshold breach logic**: unlike KPI status (ratio vs target), KRI/KCI breach is based on a configured `alert_threshold` and a `direction` enum (`lower_is_worse` / `higher_is_worse`). This logic lives in pure utility functions (`lib/risk/kri-utils.ts`, `lib/audit/kci-utils.ts`) analogous to `calculateKpiStatus()`.

The second concern is **sidebar navigation**: the existing `SidebarLayout.tsx` uses a flat `ALL_NAV_ITEMS` array. Adding KRI/KCI sub-navigation requires either adding two new top-level nav items with sub-links, or rendering sub-nav links inside the Risk and Audit module pages themselves. Given the sidebar currently collapses to icons, nesting sub-items inline in the module pages (as quick-link cards) is the lower-risk approach.

**Primary recommendation:** Deliver in five plans — (1) DB migrations, (2) server actions + queries + utils, (3) KRI UI (list/detail/reading form), (4) KCI UI + alert routes, (5) dashboard integration + sidebar nav + verification.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| KRI/KCI schema + RLS + triggers | Database (Supabase Postgres) | — | Data integrity enforced at DB layer; RLS prevents cross-institution leaks |
| Threshold breach logic | API / Backend (Server Action / alert service) | — | Pure function called by both cron alert service and reading-record action for inline status computation |
| Reading entry (createKriReading) | API / Backend (Server Action) | Frontend Server (revalidatePath) | Supabase insert via RLS-aware client; institution_id from JWT claim only |
| Alert email dispatch | API / Backend (Route Handler cron) | — | CRON_SECRET protected POST; calls Resend via admin client |
| KRI list / detail / readings pages | Frontend Server (Server Components) | — | Server-rendered with `force-dynamic`; data fetched server-side via Supabase |
| KRI reading form | Frontend (Client Component) | Frontend Server (action) | react-hook-form + Zod + Server Action — matches KpiReadingForm pattern |
| Dashboard KRI/KCI tiles | Frontend Server (Server Component) | — | Additive stat cards; data fetched alongside existing dashboard queries |
| Sidebar nav additions | Frontend (Client Component — SidebarLayout) | — | `ALL_NAV_ITEMS` array extended or sub-links added to module overview pages |
| Sparkline trend | Frontend (Client Component — KpiSparkline reuse) | — | `KpiSparkline` already accepts generic `readings + status`; thin wrapper or prop extension |

---

## Standard Stack

All libraries already installed. No new packages needed for Phase 9.

### Core (already in project)
| Library | Purpose in Phase 9 | Verified |
|---------|---------------------|----------|
| Next.js 14 App Router | Server Actions, Server Components, Route Handlers | [VERIFIED: codebase] |
| Supabase (`@supabase/ssr`) | Postgres inserts, RLS-aware client, admin client for email lookups | [VERIFIED: codebase] |
| Zod v3 | KRI/KCI definition + reading schemas; `numericField()` helper reused | [VERIFIED: `lib/schemas/strategic.ts`] |
| react-hook-form | Reading entry forms — same integration as KpiReadingForm | [VERIFIED: codebase] |
| Recharts | KpiSparkline reuse on KRI/KCI detail pages | [VERIFIED: `KpiSparkline.tsx`] |
| Resend | Alert email dispatch — same pattern as compliance escalation | [VERIFIED: `lib/compliance/escalation.ts`] |
| date-fns | Period formatting on detail pages | [VERIFIED: `kpis/[id]/page.tsx`] |
| Tailwind + shadcn/ui | Status badges, form layout, stat cards | [VERIFIED: codebase] |

**No `npm install` step required for Phase 9.**

---

## Architecture Patterns

### System Architecture Diagram

```
[Cron scheduler / pg_cron]
        |
        | POST x-cron-secret
        v
[app/api/kri/alert/route.ts]          [app/api/kci/alert/route.ts]
[app/api/compliance/escalate pattern] [same pattern]
        |                                    |
        v                                    v
[lib/risk/kri-alert.ts]               [lib/audit/kci-alert.ts]
  queryKriBreaches() → admin client     queryKciBreaches() → admin client
  direction-aware breach check          same logic
        |                                    |
        v                                    v
[Resend email] ─── owner + governance officers ──────────────────┐
                                                                  |
[User browser]                                                    |
  → /risk/kris          (KRI list)                                |
  → /risk/kris/new      (KRI definition form)                     |
  → /risk/kris/[id]     (KRI detail + sparkline + readings)       |
  → /risk/kris/[id]/readings/new (Record Reading form)            |
  → /audit/kcis                  (KCI list)                       |
  → /audit/kcis/new              (KCI definition form)            |
  → /audit/kcis/[id]             (KCI detail)                     |
  → /audit/kcis/[id]/readings/new (KCI reading form)              |
        |                                                         |
        v                                                         |
[Server Action: createKriDefinition / recordKriReading]           |
[Server Action: createKciDefinition / recordKciReading]           |
  Zod safeParse → supabase.from(...).insert(...)                  |
  institution_id from JWT claim only                              |
  revalidatePath(...)                                             |
        |                                                         |
        v                                                         |
[Supabase Postgres]                                               |
  kri_definitions (RLS: institution_id + role)                    |
  kri_readings    (RLS: institution_id; no UPDATE policy)         |
  kci_definitions (RLS: institution_id + role)                    |
  kci_readings    (RLS: institution_id; no UPDATE policy)         |
  audit triggers on all 4 tables                                  |
        |                                                         |
        v                                                         |
[app/(protected)/dashboard/page.tsx]                              |
  additive stat tiles: KRI counts, KCI health %    ◄─────────────┘
```

### Recommended Project Structure (new files only)

```
supabase/migrations/
  20260525000001_kri_schema.sql          # kri_definitions + kri_readings enums + tables + indexes
  20260525000002_kri_rls.sql             # RLS policies for kri tables
  20260525000003_kri_triggers.sql        # audit.attach_audit_trigger() for both kri tables
  20260525000004_kci_schema.sql          # kci_definitions + kci_readings tables
  20260525000005_kci_rls.sql             # RLS policies for kci tables
  20260525000006_kci_triggers.sql        # audit triggers for kci tables

types/
  kri.ts                                 # KriStatus, KriDirection, KriDefinition, KriReading
  kci.ts                                 # KciStatus, KciDefinition, KciReading

lib/schemas/
  kri.ts                                 # kriDefinitionSchema, kriReadingSchema + inferred types
  kci.ts                                 # kciDefinitionSchema, kciReadingSchema + inferred types

lib/risk/
  kri-utils.ts                           # calculateKriStatus(), KRI_STATUS_BADGE, isKriBreach()
  kri-actions.ts ('use server')          # createKriDefinition, recordKriReading
  kri-queries.ts                         # getKrisWithReadings(), getLatestKriReading()
  kri-alert.ts                           # sendKriBreachAlerts() — mirrors lib/compliance/escalation.ts

lib/audit/
  kci-utils.ts                           # calculateKciStatus(), KCI_STATUS_BADGE, isKciBreach()
  kci-actions.ts ('use server')          # createKciDefinition, recordKciReading
  kci-queries.ts                         # getKcisWithReadings(), getLatestKciReading()
  kci-alert.ts                           # sendKciBreachAlerts()

app/api/
  kri/alert/route.ts                     # CRON_SECRET POST — calls sendKriBreachAlerts()
  kci/alert/route.ts                     # CRON_SECRET POST — calls sendKciBreachAlerts()

app/(protected)/risk/kris/
  page.tsx                               # KRI list (Server Component)
  new/page.tsx                           # New KRI definition page
  new/KriForm.tsx                        # KRI definition form (Client Component)
  [id]/page.tsx                          # KRI detail + readings history + sparkline
  [id]/readings/new/page.tsx             # Record reading page
  [id]/readings/new/KriReadingForm.tsx   # Reading form (Client Component)

app/(protected)/audit/kcis/
  page.tsx                               # KCI list (Server Component)
  new/page.tsx                           # New KCI definition page
  new/KciForm.tsx                        # KCI definition form (Client Component)
  [id]/page.tsx                          # KCI detail + readings + sparkline
  [id]/readings/new/page.tsx             # Record KCI reading page
  [id]/readings/new/KciReadingForm.tsx   # Reading form (Client Component)

components/
  indicators/IndicatorSparkline.tsx      # Generic wrapper over KpiSparkline with IndicatorStatus type
  indicators/IndicatorStatusBadge.tsx    # Badge component for on_track/at_risk/breached/no_data
```

---

## Pattern 1: Database Schema (mirrors kpi_readings / strategic schema)

**What:** Four new tables in two migrations — definitions hold configuration, readings hold time-series values.

**Key differences from KPI schema:**
- `kri_definitions` adds `alert_threshold numeric`, `direction indicator_direction` enum, and optional `risk_id` FK
- `kci_definitions` adds `alert_threshold numeric`, `direction indicator_direction`, `test_cadence kpi_frequency`, and required `treatment_id` FK
- Both readings tables use `period_start date` + `period_end date` (more precise than KPI's `reporting_period text`) and `status indicator_status`

```sql
-- Source: [VERIFIED: supabase/migrations/20260522000007_strategic_schema.sql — exact pattern]

-- Shared enums (migration 20260525000001)
create type public.indicator_status as enum (
  'on_track', 'at_risk', 'breached', 'no_data'
);

create type public.indicator_direction as enum (
  'lower_is_worse',   -- pass rate: lower actual = worse → breach when actual < threshold
  'higher_is_worse'   -- incident count: higher actual = worse → breach when actual > threshold
);

create table public.kri_definitions (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete restrict,
  risk_id          uuid references public.risks(id) on delete set null,  -- optional link
  title            text not null,
  description      text,
  unit_of_measure  text not null,
  target_value     numeric not null,
  alert_threshold  numeric not null,
  direction        public.indicator_direction not null default 'lower_is_worse',
  owner_id         uuid references auth.users(id) on delete set null,
  reporting_frequency public.kpi_frequency not null default 'monthly',
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.kri_readings (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete restrict,
  kri_id           uuid not null references public.kri_definitions(id) on delete cascade,
  period_start     date not null,
  period_end       date not null,
  actual_value     numeric not null,
  status           public.indicator_status not null default 'no_data',
  notes            text,
  recorded_by      uuid references auth.users(id) on delete set null,
  recorded_at      timestamptz not null default now()
);
-- (kci tables follow same pattern with treatment_id FK replacing risk_id)
```

---

## Pattern 2: Threshold Breach Logic (kri-utils.ts)

**What:** Pure functions for status calculation and breach detection — analogous to `calculateKpiStatus()` but direction-aware.

```typescript
// Source: [VERIFIED: derived from lib/strategic/kpi-utils.ts pattern]
// lib/risk/kri-utils.ts

export type IndicatorStatus = 'on_track' | 'at_risk' | 'breached' | 'no_data'
export type IndicatorDirection = 'lower_is_worse' | 'higher_is_worse'

/**
 * Calculate indicator status based on actual vs target vs alert_threshold.
 * Direction governs which side of the threshold is "worse".
 *
 * lower_is_worse (e.g. pass rate %):
 *   actual >= target          → on_track
 *   actual >= alert_threshold → at_risk
 *   actual < alert_threshold  → breached
 *
 * higher_is_worse (e.g. incident count):
 *   actual <= target          → on_track
 *   actual <= alert_threshold → at_risk
 *   actual > alert_threshold  → breached
 */
export function calculateIndicatorStatus(
  actualValue: number | null | undefined,
  targetValue: number,
  alertThreshold: number,
  direction: IndicatorDirection,
): IndicatorStatus {
  if (actualValue === null || actualValue === undefined) return 'no_data'

  if (direction === 'lower_is_worse') {
    if (actualValue >= targetValue)     return 'on_track'
    if (actualValue >= alertThreshold)  return 'at_risk'
    return 'breached'
  } else {
    if (actualValue <= targetValue)     return 'on_track'
    if (actualValue <= alertThreshold)  return 'at_risk'
    return 'breached'
  }
}

/** Returns true when the reading is a breach (alert should fire). */
export function isIndicatorBreach(
  actualValue: number,
  alertThreshold: number,
  direction: IndicatorDirection,
): boolean {
  return direction === 'lower_is_worse'
    ? actualValue < alertThreshold
    : actualValue > alertThreshold
}

export const INDICATOR_STATUS_BADGE: Record<IndicatorStatus, { label: string; className: string }> = {
  on_track: { label: 'On Track',  className: 'bg-ok/10 text-ok border-ok/30' },
  at_risk:  { label: 'At Risk',   className: 'bg-warn/10 text-warn border-warn/30' },
  breached: { label: 'Breached',  className: 'bg-err/10 text-err border-err/30' },
  no_data:  { label: 'No Data',   className: 'bg-paper text-navy-mid border-paper-border' },
}
```

---

## Pattern 3: Server Action (kri-actions.ts)

**What:** Mirrors `lib/strategic/actions.ts` — Zod safeParse, getUser(), role check, Supabase insert, revalidatePath.

**Role assignments:**
- `createKriDefinition`: `['admin', 'ceo', 'risk-officer']` — same as `KPI_ROLES`
- `recordKriReading`: owner check (`kri.owner_id === user.id`) OR `activeRole === 'admin'` — same as `recordKpiReading`
- `createKciDefinition`: `['admin', 'audit-officer']` — mirrors audit module roles
- `recordKciReading`: owner check OR `activeRole === 'admin'`

```typescript
// Source: [VERIFIED: lib/strategic/actions.ts + lib/risk/actions.ts patterns]
'use server'
// lib/risk/kri-actions.ts

export async function createKriDefinition(
  values: KriDefinitionInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kriDefinitionSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta = user.app_metadata as Record<string, string>
    const activeRole = appMeta?.active_role
    const institutionId = appMeta?.institution_id

    if (!KRI_WRITE_ROLES.includes(activeRole as AppRole)) {
      return { error: 'You do not have permission to create KRI definitions.' }
    }

    const { data, error } = await supabase
      .from('kri_definitions')
      .insert({ ...parsed.data, institution_id: institutionId, created_by: user.id })
      .select('id')
      .single()

    if (error) {
      console.error('[createKriDefinition] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/risk/kris')
    revalidatePath('/risk')

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createKriDefinition] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
```

---

## Pattern 4: Alert Service (kri-alert.ts)

**What:** Mirrors `lib/compliance/escalation.ts` exactly — admin client, recipient Set, Resend email send.

**Key difference from compliance escalation:** Breach is value-based, not date-based. The alert service queries `kri_readings` for the most recent reading per KRI definition and checks `isIndicatorBreach()`.

```typescript
// Source: [VERIFIED: lib/compliance/escalation.ts pattern]
// lib/risk/kri-alert.ts

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { isIndicatorBreach } from '@/lib/risk/kri-utils'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendKriBreachAlerts(): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient()
  let sent = 0; let skipped = 0

  // Fetch all KRI definitions with their latest reading
  // PostgREST: fetch kri_definitions joined with kri_readings, filter in app
  const { data: definitions } = await admin
    .from('kri_definitions')
    .select('id, title, unit_of_measure, alert_threshold, direction, owner_id, institution_id, kri_readings(actual_value, recorded_at)')

  for (const def of definitions ?? []) {
    // Find latest reading (mirrors getLatestReading() pattern)
    const readings = (def.kri_readings ?? []).sort(
      (a: { recorded_at: string }, b: { recorded_at: string }) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )
    const latest = readings[0]
    if (!latest) { skipped++; continue }

    if (!isIndicatorBreach(latest.actual_value, def.alert_threshold, def.direction)) {
      skipped++; continue
    }

    const recipients = new Set<string>()

    // Owner email
    if (def.owner_id) {
      const { data: ownerUser } = await admin.auth.admin.getUserById(def.owner_id)
      if (ownerUser?.user?.email) recipients.add(ownerUser.user.email)
    }

    // Governance officers (admin + ceo roles) for this institution
    const { data: govProfiles } = await admin
      .from('user_profiles')
      .select('id')
      .eq('institution_id', def.institution_id)
      .in('active_role', ['admin', 'ceo', 'risk-officer'])

    for (const profile of govProfiles ?? []) {
      const { data: u } = await admin.auth.admin.getUserById((profile as { id: string }).id)
      if (u?.user?.email) recipients.add(u.user.email)
    }

    if (recipients.size === 0) { skipped++; continue }

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@grc-nexus.gov.zw',
        to: Array.from(recipients),
        subject: `⚠ KRI Alert: ${escapeHtml(def.title)} has breached threshold (${latest.actual_value} vs threshold ${def.alert_threshold})`,
        html: `
          <p>This is an automated KRI threshold alert from GRC-Nexus.</p>
          <p><strong>Indicator:</strong> ${escapeHtml(def.title)}</p>
          <p><strong>Actual Value:</strong> ${latest.actual_value} ${escapeHtml(def.unit_of_measure)}</p>
          <p><strong>Alert Threshold:</strong> ${def.alert_threshold} ${escapeHtml(def.unit_of_measure)}</p>
          <p>Please log in to GRC-Nexus to review this indicator and take corrective action.</p>
        `,
      })
      sent++
    } catch (emailErr) {
      console.error('[sendKriBreachAlerts] Email send error:', emailErr)
      skipped++
    }
  }

  return { sent, skipped }
}
```

---

## Pattern 5: CRON Route (app/api/kri/alert/route.ts)

**What:** Identical structure to `app/api/compliance/escalate/route.ts`.

```typescript
// Source: [VERIFIED: app/api/compliance/escalate/route.ts]
// app/api/kri/alert/route.ts

export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await sendKriBreachAlerts()
    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error('[kri/alert] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Pattern 6: Zod Schema (lib/schemas/kri.ts)

**What:** Mirrors `lib/schemas/strategic.ts` using the existing `numericField()` helper.

```typescript
// Source: [VERIFIED: lib/schemas/strategic.ts numericField() pattern]
// lib/schemas/kri.ts
import { z } from 'zod'

const numericField = (errorMessage: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number({ invalid_type_error: errorMessage }),
  )

export const kriDefinitionSchema = z.object({
  title:               z.string().min(1, 'Title is required.'),
  description:         z.string().optional(),
  risk_id:             z.string().uuid().optional().nullable(),
  unit_of_measure:     z.string().min(1, 'Unit of measure is required.'),
  target_value:        numericField('Target must be a number.'),
  alert_threshold:     numericField('Alert threshold must be a number.'),
  direction:           z.enum(['lower_is_worse', 'higher_is_worse']),
  owner_id:            z.string().uuid('Owner must be a valid user.'),
  reporting_frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
})

export const kriReadingSchema = z.object({
  period_start:  z.string().min(1, 'Period start is required.'),
  period_end:    z.string().min(1, 'Period end is required.'),
  actual_value:  numericField('Actual value must be a number.'),
  notes:         z.string().optional(),
})

export type KriDefinitionInput = z.infer<typeof kriDefinitionSchema>
export type KriReadingInput    = z.infer<typeof kriReadingSchema>
```

---

## Pattern 7: IndicatorSparkline Component

**What:** Thin wrapper or prop extension of `KpiSparkline` — generalised to accept `IndicatorStatus` instead of `KpiStatus`.

**Approach:** Create `components/indicators/IndicatorSparkline.tsx` with identical implementation to `KpiSparkline.tsx` but accepting `IndicatorStatus`. This avoids modifying the existing Phase 2 component and breaking its usage.

```typescript
// Source: [VERIFIED: app/(protected)/strategic/KpiSparkline.tsx]
// components/indicators/IndicatorSparkline.tsx
'use client'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { IndicatorStatus } from '@/lib/risk/kri-utils'

interface IndicatorSparklineProps {
  readings: { actual_value: number; period_start: string }[]
  status: IndicatorStatus
}

const SPARKLINE_COLOR: Record<IndicatorStatus, string> = {
  on_track: '#27AE60',
  at_risk:  '#E67E22',
  breached: '#E74C3C',   // same as KPI off_track
  no_data:  '#D7E2EF',
}

export function IndicatorSparkline({ readings, status }: IndicatorSparklineProps) {
  const data = [...readings]
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .slice(-6)
    .map((r) => ({ value: r.actual_value }))

  if (data.length === 0) {
    return <div className="w-[80px] h-[32px] rounded bg-paper-border/30" />
  }

  return (
    <div className="w-[80px] h-[32px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={SPARKLINE_COLOR[status]}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## Pattern 8: Sidebar Nav Extension

**What:** `SidebarLayout.tsx` uses a flat `ALL_NAV_ITEMS` array. The sidebar currently has no sub-nav concept.

**Chosen approach (low disruption):** Add two new entries to `ALL_NAV_ITEMS` — `/risk/kris` and `/audit/kcis` — as standalone nav links with role guards. This matches the existing sidebar rendering logic exactly and avoids rearchitecting the sidebar.

```typescript
// Source: [VERIFIED: components/layout/SidebarLayout.tsx]
// Additions to ALL_NAV_ITEMS:
{ href: '/risk/kris', label: 'KRIs', icon: TrendingDown,
  roles: ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member'] },
{ href: '/audit/kcis', label: 'KCIs', icon: Activity,
  roles: ['admin', 'ceo', 'audit-officer', 'risk-officer', 'board-member'] },
```

`TrendingDown` and `Activity` are available in `lucide-react` (already installed).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP client | `resend` (already installed) | Already used in 4 modules; handles bounce, deliverability |
| HTML escaping in emails | Custom sanitizer | `escapeHtml()` from `lib/compliance/escalation.ts` | Already written; prevents stored XSS in email clients |
| Admin user lookup | Direct auth.users query from RLS client | `createAdminClient()` + `admin.auth.admin.getUserById()` | RLS client cannot query auth.users; admin client bypasses RLS safely |
| Numeric coercion | Custom preprocess | `numericField()` from `lib/schemas/strategic.ts` | Already handles empty-string-to-undefined edge case |
| Sparkline chart | Custom SVG | `IndicatorSparkline` (thin wrapper of KpiSparkline) | Recharts already bundled; `isAnimationActive={false}` prevents layout jank |
| Status badge styling | Custom class logic | `INDICATOR_STATUS_BADGE` record (exact same pattern as KPI) | Type-safe, consistent with existing Tailwind tokens |

**Key insight:** Every mechanism needed for Phase 9 has been built and proven in Phases 2–6. The engineering task is wiring — not invention.

---

## Common Pitfalls

### Pitfall 1: Readings Status Not Computed on Record
**What goes wrong:** Reading is inserted with `status = 'no_data'` (default). The alert service must then re-derive status at query time, creating two sources of truth.
**Why it happens:** Temptation to keep reading insertion simple and defer status calculation.
**How to avoid:** Compute `calculateIndicatorStatus()` inside the Server Action (`recordKriReading` / `recordKciReading`) and persist the computed `status` to the readings table. This way the status column on `kri_readings` is always correct.
**Warning signs:** Alert service checks `status = 'breached'` on readings table but readings always show `no_data`.

### Pitfall 2: Direction Logic Inverted for higher_is_worse
**What goes wrong:** Breach fires when `actual < threshold` even for a `higher_is_worse` indicator (e.g. incident count: 3 incidents vs threshold 5 — should NOT be a breach but fires anyway).
**Why it happens:** Copy-pasting `lower_is_worse` logic without inverting.
**How to avoid:** `isIndicatorBreach()` has explicit `direction` branch. Unit-test both directions before wiring into alert service.
**Warning signs:** Alert email fires for on_track `higher_is_worse` indicators.

### Pitfall 3: Alert Fires on Every Cron Even for Unchanged Breaches
**What goes wrong:** KRI stays breached for 7 days; owner receives 7 emails.
**Why it happens:** Alert service has no "already alerted" deduplication.
**How to avoid:** Two options — (a) add `last_alerted_at` column to `kri_definitions` and skip if alerted within 24h, or (b) only alert on readings inserted in the last 24h (query `recorded_at >= now() - interval '1 day'`). Option (b) is simpler and requires no schema change. Scope queries to `recorded_at > (now() - interval '25 hours')` to catch readings recorded near the cron boundary.
**Warning signs:** Governance officer inbox floods with identical alerts.

### Pitfall 4: institution_id Sourced from Client Input
**What goes wrong:** KRI is assigned to a different institution because `institution_id` is passed from the form.
**Why it happens:** Overlooking the security pattern — institution_id must ONLY come from JWT claims.
**How to avoid:** Same as all existing actions — `institutionId = appMeta?.institution_id` from `user.app_metadata`. Never accept institution_id as a form field.
**Warning signs:** RLS allows insert but records appear in wrong institution's view.

### Pitfall 5: KCI treatment_id FK Points to Soft-Deleted Treatment
**What goes wrong:** KCI definition orphaned when parent `risk_treatment` is cancelled/removed.
**Why it happens:** `risk_treatments` uses status fields, not hard deletes — but if a treatment is later hard-deleted, the FK will cascade.
**How to avoid:** `kci_definitions.treatment_id` references `risk_treatments(id) ON DELETE SET NULL` (matches the `risk_id` optional FK pattern on `kri_definitions`). KCI list page filters on `treatment_id IS NOT NULL` to surface orphaned KCIs.
**Warning signs:** KCI detail page 404s because treatment no longer exists.

### Pitfall 6: Sidebar Nav Active State
**What goes wrong:** `/risk/kris` link is not highlighted when viewing `/risk/kris/new` or `/risk/kris/[id]`.
**Why it happens:** `SidebarLayout.tsx` does not implement active state — links are plain `<Link>` components with no `pathname` matching.
**How to avoid:** Not an issue — the current sidebar has no active highlighting. Just add nav entries and move on. Do not introduce `usePathname` just for Phase 9.
**Warning signs:** N/A — this is a visual nicety, not a bug.

### Pitfall 7: Missing `export const dynamic = 'force-dynamic'`
**What goes wrong:** KRI list or detail page serves cached HTML — newly added readings don't appear without a full cold start.
**Why it happens:** Next.js ISR caches server-rendered output by default.
**How to avoid:** Add `export const dynamic = 'force-dynamic'` to every `page.tsx` under `/risk/kris/` and `/audit/kcis/`, exactly as every other protected page in the codebase does.
**Warning signs:** Recorded reading doesn't appear immediately after form submission.

---

## Runtime State Inventory

Step 2.5 evaluation: Phase 9 is a **greenfield feature addition** — no rename, refactor, or migration of existing data.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — new tables only; no existing records to migrate | None |
| Live service config | pg_cron entries for compliance/audit/risk escalation are separate jobs — KRI/KCI need NEW pg_cron schedules added | Manual pg_cron setup per alert route (documented in route comment, same as compliance escalate route) |
| OS-registered state | None | None |
| Secrets/env vars | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` already set for existing alert routes — reused without change | None — KRI/KCI alert routes consume same env vars |
| Build artifacts | None | None |

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Supabase Postgres | All new tables | Yes | Verified: existing migrations deployed |
| `resend` npm package | KRI/KCI alert emails | Yes | Verified: in package.json, used in compliance/audit modules |
| `RESEND_API_KEY` env var | Alert service | Assumed set | Already required by compliance escalation |
| `CRON_SECRET` env var | Alert API routes | Assumed set | Already required by compliance escalate route |
| Recharts | IndicatorSparkline | Yes | Verified: used in KpiSparkline |
| lucide-react (`TrendingDown`, `Activity`) | Sidebar nav icons | Yes | Verified: lucide-react in package.json |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (detected: `app/(protected)/risk/risk-pages.test.tsx` exists) |
| Config file | Likely `vitest.config.ts` at project root |
| Quick run command | `npx vitest run --reporter=verbose lib/risk/kri-utils.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRIDGE-KRI-01 | `createKriDefinition` rejects invalid input (no title, no unit) | unit | `npx vitest run lib/risk/kri-actions.test.ts -t "createKriDefinition"` | No — Wave 0 |
| BRIDGE-KRI-02 | `recordKriReading` inserts append-only (does not overwrite) | unit | `npx vitest run lib/risk/kri-actions.test.ts -t "recordKriReading"` | No — Wave 0 |
| BRIDGE-KRI-01/02 | `calculateIndicatorStatus()` all direction branches | unit | `npx vitest run lib/risk/kri-utils.test.ts` | No — Wave 0 |
| BRIDGE-KRI-01 | `isIndicatorBreach()` correct for both directions | unit | `npx vitest run lib/risk/kri-utils.test.ts -t "isIndicatorBreach"` | No — Wave 0 |
| BRIDGE-ALERT-01 | Alert route returns 401 on missing/wrong CRON_SECRET | smoke | `npx vitest run app/api/kri/alert/route.test.ts` | No — Wave 0 |
| BRIDGE-ALERT-02 | Alert route returns 401 on missing/wrong CRON_SECRET (KCI) | smoke | `npx vitest run app/api/kci/alert/route.test.ts` | No — Wave 0 |
| BRIDGE-KCI-01 | `kriDefinitionSchema` / `kciDefinitionSchema` Zod coercion of numeric fields | unit | `npx vitest run lib/schemas/kri.test.ts` | No — Wave 0 |

### Wave 0 Gaps

- [ ] `lib/risk/kri-utils.test.ts` — covers `calculateIndicatorStatus()` and `isIndicatorBreach()` for both directions
- [ ] `lib/schemas/kri.test.ts` — covers `numericField()` edge cases (empty string → undefined) and direction enum validation
- [ ] `lib/schemas/kci.test.ts` — same for KCI schemas

*(Alert route and action tests are integration-level; acceptable to cover via manual verification if vitest mocking of Supabase is not already set up in the project.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `supabase.auth.getUser()` (not getSession) in every action — already project standard |
| V3 Session Management | Inherited | Handled by existing `@supabase/ssr` middleware |
| V4 Access Control | Yes | Role check via `user.app_metadata.active_role` (JWT claim); institution_id from JWT; `CRON_SECRET` on alert routes |
| V5 Input Validation | Yes | Zod `safeParse` before every DB call; `numericField()` rejects empty strings |
| V6 Cryptography | No | No new crypto operations in Phase 9 |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mass assignment via form field injection | Tampering | Only `parsed.data` reaches DB insert (Zod strips unknown fields) |
| Cross-institution data read | Information Disclosure | RLS `institution_id = (select public.institution_id())` on all new tables |
| Unauthenticated cron trigger | Spoofing | `CRON_SECRET` header check as FIRST operation in route handler |
| Stored XSS via indicator title in email | Tampering | `escapeHtml()` on all user-supplied strings in email HTML |
| institution_id from client input | Elevation of Privilege | institution_id sourced from `user.app_metadata.institution_id` only — never from form payload |
| Alert email recipient disclosure | Information Disclosure | `new Set<string>()` deduplication; admin client only; emails not logged |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` are already set in Vercel environment variables | Environment Availability | Alert emails silently fail; cron routes return 401 |
| A2 | `kpi_frequency` enum already exists in Postgres and can be reused for `reporting_frequency` on `kri_definitions` / `kci_definitions` | Standard Stack | Migration will fail; need to add enum values or create new `kri_frequency` enum |
| A3 | `risk_treatments` table has no hard-delete RLS policy that would orphan KCI definitions | Pitfall 5 | `ON DELETE SET NULL` constraint on `treatment_id` FK is sufficient |

**A2 note:** `kpi_frequency` enum is defined in `20260522000007_strategic_schema.sql` and is a shared Postgres type. Reusing it for KRI/KCI `reporting_frequency` is consistent with the existing schema. [VERIFIED: migration file confirms `kpi_frequency` is a public-schema enum.]

---

## Open Questions

1. **Alert deduplication strategy**
   - What we know: The cron fires daily; a breached KRI will trigger an email every day until the reading improves.
   - What's unclear: The user has not specified whether repeated breach alerts are acceptable or if deduplication is required.
   - Recommendation: Implement option (b) — only query readings inserted in the last 25 hours — at plan time. This is simpler than a `last_alerted_at` column and handles the common case. Document it in the plan so user can override.

2. **KCI `test_cadence` vs `reporting_frequency`**
   - What we know: CONTEXT.md mentions `test_cadence` for KCI definitions; the schema pattern uses `kpi_frequency` enum.
   - What's unclear: Whether `test_cadence` and `reporting_frequency` are the same field with a different name, or two separate fields (cadence = how often to test, frequency = how often to report).
   - Recommendation: Treat them as one field named `reporting_frequency` (same enum) for Phase 9; the `test_cadence` label is used in UI copy only. Revisit in Phase 10 (continuous control testing) if separate cadences are needed.

3. **Governance officers definition for alert recipients**
   - What we know: CONTEXT.md says "KRI/KCI owner + all institution governance officers". Compliance escalation uses `active_role = 'admin'`. Risk escalation uses `ceo` role.
   - What's unclear: Exact role list for "governance officers" in the KRI/KCI context.
   - Recommendation: Alert recipients = KRI owner + `['admin', 'ceo', 'risk-officer']` for KRI; KCI owner + `['admin', 'ceo', 'audit-officer']` for KCI. This matches the domain ownership pattern.

---

## Sources

### Primary (HIGH confidence — verified from codebase)
- `lib/strategic/kpi-utils.ts` — `calculateKpiStatus()` pattern replicated as `calculateIndicatorStatus()`
- `lib/strategic/actions.ts` — Server Action pattern (safeParse → getUser → role check → insert → revalidatePath)
- `lib/strategic/queries.ts` — `getKpisWithReadings()` + `getLatestReading()` patterns
- `lib/compliance/escalation.ts` — Full alert email service pattern with `escapeHtml()` + admin client
- `app/api/compliance/escalate/route.ts` — CRON_SECRET protected route pattern
- `supabase/migrations/20260522000007_strategic_schema.sql` — KPI table schema (exact model to replicate)
- `supabase/migrations/20260522000017_risk_schema.sql` — Risk/treatment FK pattern
- `supabase/migrations/20260522000018_risk_rls.sql` — RLS policy pattern
- `supabase/migrations/20260522000019_risk_triggers.sql` — `audit.attach_audit_trigger()` pattern
- `app/(protected)/strategic/KpiSparkline.tsx` — Sparkline component to replicate as `IndicatorSparkline`
- `components/layout/SidebarLayout.tsx` — `ALL_NAV_ITEMS` pattern for nav additions
- `lib/schemas/strategic.ts` — `numericField()` Zod preprocess helper
- `types/auth.ts` — `AppRole` type for role checks
- `app/(protected)/strategic/kpis/[id]/page.tsx` — Detail page pattern (readings table, Record Reading link)

### Secondary (MEDIUM confidence)
- `audit_gaps.md` — Gap analysis confirming KRI/KCI schema requirements and alert service architecture

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries verified in codebase; no new dependencies
- Architecture: HIGH — all patterns directly derived from existing working code
- Pitfalls: HIGH — pitfalls identified from pattern analysis of existing code and common Supabase/Next.js mistakes
- Schema: HIGH — exact column-level design derived from existing migration files

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stable stack; 30-day window)
