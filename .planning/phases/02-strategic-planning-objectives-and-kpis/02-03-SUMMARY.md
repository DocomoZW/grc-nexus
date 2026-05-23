---
phase: "02-strategic-planning-objectives-and-kpis"
plan: "03"
subsystem: "strategic-planning"
tags: [server-actions, rbac, zod, tdd, queries, supabase, security]

dependency_graph:
  requires:
    - "02-01: strategic_objectives, kpis, kpi_readings DB tables"
    - "02-02: objectiveSchema, kpiSchema, kpiReadingSchema from lib/schemas/strategic.ts"
    - "02-02: ObjectiveInput, KpiInput, KpiReadingInput types from lib/schemas/strategic.ts"
    - "02-02: ObjectiveStatus type from types/strategic.ts"
    - "01-01: createClient() from lib/supabase/server.ts (server-side Supabase client)"
  provides:
    - "lib/strategic/actions.ts: 6 Server Actions for all strategic CRUD"
    - "lib/strategic/queries.ts: 3 query helpers for Server Components"
    - "tests/strategic/actions.test.ts: 27 unit tests covering RBAC and error paths"
  affects:
    - "02-04: UI forms call createObjective, createKpi, recordKpiReading"
    - "02-05: KPI dashboard page uses getKpisWithReadings, getObjectives, getLatestReading"
    - "02-06+: All subsequent plans consume these actions and queries"

tech-stack:
  added: []
  patterns:
    - "Server Action pattern: 'use server' + Zod safeParse + getUser() + role check + DB call + revalidatePath"
    - "Role check via user.app_metadata.active_role (JWT claim) — never a DB query"
    - "institutionId always from app_metadata.institution_id (JWT claim) — never from client"
    - "recordKpiReading: two-step DB pattern — fetch KPI for ownership check, then insert reading"
    - "Generic error to client; full error only in console.error server-side"
    - "Query helpers accept SupabaseClient param for request-scoped client sharing"
    - "getLatestReading: pure JS sort — no Supabase, no async, no framework imports"

key-files:
  created:
    - "lib/strategic/actions.ts"
    - "lib/strategic/queries.ts"
    - "tests/strategic/actions.test.ts"
  modified: []

key-decisions:
  - "recordKpiReading fetches KPI before insert to get owner_id and institution_id from DB (not client) — prevents spoofing institution_id"
  - "institution_id on kpi_readings sourced from the KPI row, not from JWT claims — ensures reading inherits correct scope even if KPI was created by a different admin session"
  - "getLatestReading is a pure synchronous function (no Supabase call) — callers sort in JS, matching Approach A from RESEARCH.md Q3"
  - "updateKpi mock in tests needed update: kpis table mock originally only provided select+insert (no update) — fixed as Rule 1 auto-fix"
  - "Test data UUIDs must be valid UUIDs — Zod schema validates owner_id and objective_id as z.string().uuid(); non-UUID test values caused safeParse failure before role check ran (auto-fixed Rule 1)"

requirements-completed: [STRAT-01, STRAT-02, STRAT-03, STRAT-04, STRAT-05]

duration: "4m"
completed: "2026-05-23"
---

# Phase 02 Plan 03: Strategic Server Actions and Query Helpers Summary

**Six Server Actions and three query helpers forming the complete trust boundary between the browser and the strategic planning database — all RBAC, Zod validation, and revalidatePath calls live here.**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-05-23T04:40:59Z
- **Completed:** 2026-05-23T04:44:57Z
- **Tasks:** 2 (Task 6 TDD, Task 7 standard)
- **Files created:** 3

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 6 RED | Failing tests for Server Actions | c1268f3 | tests/strategic/actions.test.ts |
| 6 GREEN | Implement Server Actions | 768c49f | lib/strategic/actions.ts, tests/strategic/actions.test.ts |
| 7 | Query helpers | 5aacb98 | lib/strategic/queries.ts |

## What Was Built

### lib/strategic/actions.ts

Six Server Actions implementing the complete strategic planning CRUD layer:

| Action | Allowed Roles | Key Behavior |
|--------|---------------|--------------|
| `createObjective` | admin, ceo | Inserts with institution_id from JWT; revalidates /strategic/objectives and /strategic |
| `updateObjective` | admin, ceo | Updates with updated_at timestamp; revalidates detail + list pages |
| `updateObjectiveStatus` | admin, ceo | Validates status against known values before DB call |
| `createKpi` | admin, ceo, risk-officer | Inserts with institution_id from JWT; revalidates parent objective detail |
| `updateKpi` | admin, ceo, risk-officer | Updates KPI fields |
| `recordKpiReading` | KPI owner OR admin | Fetches KPI first (owner_id + institution_id), then inserts reading |

Security properties per threat model:
- `'use server'` on line 1 (mandatory Next.js directive)
- Zod `safeParse` before any DB call on all 6 actions (strips unknown fields — T-02-P03-03)
- Role checked via `user.app_metadata.active_role` JWT claim — not a DB query (T-02-P03-04)
- `institution_id` sourced from JWT claim (`app_metadata.institution_id`) on create actions
- `institution_id` sourced from KPI DB row on `recordKpiReading` (prevents institution spoofing)
- Generic error message to client; full error only in `console.error` server-side (T-02-P03-05)
- No `getSession()` calls — only `getUser()` (RESEARCH.md Pitfall 1)
- `revalidatePath` called outside try/catch (correct Next.js pattern)

### lib/strategic/queries.ts

Three query helpers for Server Component pages:

- **`getKpisWithReadings(supabase, { page })`** — Paginated KPI fetch with embedded `kpi_readings` join and `user_profiles!owner_id` join. Returns all readings per KPI (Approach A — caller uses `getLatestReading()` for latest). `KPI_PAGE_SIZE = 20`.
- **`getObjectives(supabase)`** — Full objective list with `user_profiles!owner_id` join. RLS enforces institution scoping — no manual filter needed.
- **`getLatestReading(readings)`** — Pure synchronous JS sort. No Supabase, no async, no framework imports. Sorts by `recorded_at` descending, returns first element or `null`.

Design: Each function accepts a `SupabaseClient` parameter rather than creating one internally — this enables Server Components to share a single client per request.

### tests/strategic/actions.test.ts

27 unit tests covering:
- RBAC for all 6 actions (dept-head, risk-officer, audit-officer, board-member denied from objective actions; audit-officer, board-member, dept-head denied from KPI actions)
- `recordKpiReading` KPI-not-found path
- `recordKpiReading` non-owner non-admin denied path
- `recordKpiReading` owner allowed and admin-bypass-owner-check paths
- Zod safeParse failure paths (empty title, empty period)
- Supabase error returns generic message (does not leak internal DB details)
- Unauthenticated user returns `{ error: 'Unauthorized.' }`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test data used non-UUID values for Zod-validated fields**
- **Found during:** Task 6 GREEN (first test run)
- **Issue:** `validObjective.owner_id` was `'owner-uuid-1'` and `validKpi.objective_id` was `'obj-uuid-1'` — neither is a valid UUID. The Zod schema validates these as `z.string().uuid()`, so `safeParse` failed before the role check ran, causing all role-check tests to fail with Zod errors instead of permission errors.
- **Fix:** Changed test data to use zero-padded UUID format (`'00000000-0000-0000-0000-000000000001'`).
- **Files modified:** `tests/strategic/actions.test.ts`
- **Commit:** 768c49f (included in GREEN commit)

**2. [Rule 1 - Bug] Vitest mock for `kpis` table missing `update` method**
- **Found during:** Task 6 GREEN (updateKpi test failure)
- **Issue:** The `fromImpl` mock returned different objects for `kpis` vs other tables. The `kpis` branch only had `select` and `insert` — no `update`. Calling `updateKpi()` hit `supabase.from('kpis').update is not a function`.
- **Fix:** Unified `fromImpl` to use a single `buildFromTable()` factory returning `select`, `insert`, and `update` for all tables.
- **Files modified:** `tests/strategic/actions.test.ts`
- **Commit:** 768c49f (included in GREEN commit)

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` — lib/strategic/actions.ts errors | 0 |
| `npx tsc --noEmit` — lib/strategic/queries.ts errors | 0 |
| `'use server'` on line 1 of actions.ts | Line 1: `'use server'` |
| No `getSession()` calls in actions.ts | PASS (only in comments) |
| `safeParse` call count in actions.ts | 6 |
| `institution_id` in all inserts | PASS (createObjective, createKpi, recordKpiReading) |
| All 27 unit tests passing | PASS |
| `getKpisWithReadings` has kpi_readings embedded join | PASS |
| `getLatestReading` is synchronous (no async) | PASS |

## TDD Gate Compliance

- **RED gate:** `test(02-03)` commit `c1268f3` — test file written, failing with import error (actions.ts did not exist)
- **GREEN gate:** `feat(02-03)` commit `768c49f` — implementation written, all 27 tests passing
- **REFACTOR gate:** Not needed — implementation was clean on first pass

## Known Stubs

None — this plan delivers pure server-side logic. No UI components or placeholder data rendering.

## Threat Flags

No new threat surface beyond what was planned in the threat model. All `mitigate` dispositions from the threat register are implemented:

- T-02-P03-01: `['admin','ceo'].includes(activeRole)` check in createObjective/updateObjective — mitigated
- T-02-P03-02: `kpi.owner_id === user.id || activeRole === 'admin'` check in recordKpiReading — mitigated
- T-02-P03-03: Only `parsed.data` from Zod safeParse reaches Supabase insert — mitigated
- T-02-P03-04: `user.app_metadata.active_role` from JWT (Supabase service role sets app_metadata) — mitigated
- T-02-P03-05: Generic `'An unexpected error occurred...'` returned to client; full error in console.error only — mitigated

## Self-Check: PASSED

- lib/strategic/actions.ts: FOUND
- lib/strategic/queries.ts: FOUND
- tests/strategic/actions.test.ts: FOUND
- Commit c1268f3 (test RED): FOUND in git log
- Commit 768c49f (feat GREEN): FOUND in git log
- Commit 5aacb98 (feat queries): FOUND in git log
- All 27 tests passing: CONFIRMED

---
*Phase: 02-strategic-planning-objectives-and-kpis*
*Completed: 2026-05-23*
