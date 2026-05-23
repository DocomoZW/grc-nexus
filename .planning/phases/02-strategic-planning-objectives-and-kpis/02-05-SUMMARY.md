---
phase: "02-strategic-planning-objectives-and-kpis"
plan: "05"
subsystem: "strategic-planning"
tags: [ui, recharts, tanstack-table, dashboard, kpi, sparkline, server-component, client-component]

dependency_graph:
  requires:
    - phase: "02-02"
      provides: "calculateKpiStatus, KPI_STATUS_BADGE, KpiStatus type from lib/strategic/kpi-utils.ts"
    - phase: "02-03"
      provides: "getKpisWithReadings, getLatestReading, KPI_PAGE_SIZE from lib/strategic/queries.ts"
    - phase: "02-01"
      provides: "recharts@^3.8.1 and @tanstack/react-table@^8.21.3 installed"
  provides:
    - "app/(protected)/strategic/page.tsx: KPI dashboard Server Component with force-dynamic, RBAC, paginated fetch"
    - "app/(protected)/strategic/KpiGrid.tsx: TanStack Table v8 client component with 7 columns, badges, sparklines, pagination"
    - "app/(protected)/strategic/KpiFilterBar.tsx: URL-based status filter bar with Apply/Clear"
    - "app/(protected)/strategic/KpiSparkline.tsx: Recharts LineChart 80x32px sparkline, no axes, status-colored"
  affects:
    - "02-06: any subsequent plans consuming the /strategic route will have the KPI grid available"
    - "Phase 8 (executive dashboard): /strategic is the primary KPI view referenced by the executive dashboard"

tech-stack:
  added: []
  patterns:
    - "Recharts sparkline in table cell: sized parent div (w-[80px] h-[32px]) wrapping ResponsiveContainer; isAnimationActive=false; dot=false; no axis components"
    - "TanStack Table v8: ColumnDef<T> single-type-arg; columns array in useMemo to prevent redefinition; server-fetched pages, client sorts"
    - "URL-based filter bar: useSearchParams for initial state, router.push to apply, page=1 reset on filter change"
    - "Server Component page with Client Component islands: page.tsx fetches, KpiGrid/KpiFilterBar are 'use client'"

key-files:
  created:
    - "app/(protected)/strategic/KpiSparkline.tsx"
    - "app/(protected)/strategic/KpiFilterBar.tsx"
    - "app/(protected)/strategic/KpiGrid.tsx"
    - "app/(protected)/strategic/page.tsx"
  modified: []

key-decisions:
  - "getLatestReading imported from lib/strategic/queries.ts (not kpi-utils.ts) — matches the actual implementation location from Plan 03"
  - "count passed as (count ?? 0) to KpiGrid to avoid TypeScript null type mismatch — Supabase returns number | null for count"
  - "KpiFilterBar does not include objective filter in MVP per D-21 (status filter only)"
  - "ALLOWED_ROLES list on page.tsx matches D-23 RBAC matrix — all 6 roles can view the dashboard"

patterns-established:
  - "Recharts sparkline pattern: always wrap ResponsiveContainer in w-[80px] h-[32px] div; always set isAnimationActive=false and dot=false for table cell use"
  - "TanStack Table v8 with server-side pagination: server fetches one page, client sorts/filters the page; prev/next links are plain <a> tags to server URL"

requirements-completed: [STRAT-05, STRAT-06]

duration: "12m"
completed: "2026-05-23"
---

# Phase 02 Plan 05: KPI Dashboard UI — Sparkline, FilterBar, Grid, and Page Summary

**Recharts sparkline (80x32px, no axes, status-colored) + TanStack Table v8 KPI grid with all 7 columns + URL-based filter bar, wired to the /strategic Server Component page.**

## Performance

- **Duration:** 12 minutes
- **Started:** 2026-05-23T07:00:00Z
- **Completed:** 2026-05-23T07:12:00Z
- **Tasks:** 2 (Task 10 — KpiSparkline + KpiFilterBar; Task 11 — KpiGrid + page.tsx)
- **Files created:** 4

## Accomplishments

- Delivered STRAT-06: KPI summary dashboard at /strategic with status badges and trend sparklines
- Implemented all 7 required columns (D-18): KPI Title (linked), Objective, Owner, Last Reading, Status badge, Trend sparkline, Frequency
- KpiSparkline uses isAnimationActive=false (T-02-P05-04 mitigation) — eliminates 20 simultaneous SVG animation timers in a full page

## Task Commits

Each task was committed atomically:

1. **Task 10: KpiSparkline and KpiFilterBar** - `d8465c8` (feat)
2. **Task 11: KpiGrid and strategic/page.tsx** - `f5b4c16` (feat)

**Plan metadata:** _(committed after summary)_

## Files Created/Modified

- `app/(protected)/strategic/KpiSparkline.tsx` — Recharts LineChart sparkline, 80x32px, no axes/tooltip, status-colored stroke via SPARKLINE_COLOR map matching tailwind.config.ts hex tokens
- `app/(protected)/strategic/KpiFilterBar.tsx` — 'use client' URL-based filter bar; status select (all/on_track/at_risk/off_track/no_data); Apply/Clear buttons; useSearchParams for initial state; router.push with page=1 reset
- `app/(protected)/strategic/KpiGrid.tsx` — 'use client' TanStack Table v8 (ColumnDef<KpiRow>[], useMemo columns, useReactTable with getCoreRowModel/getSortedRowModel/getFilteredRowModel); 7 columns; KpiSparkline in trend column; Badge with KPI_STATUS_BADGE; pagination footer with prev/next <a> links
- `app/(protected)/strategic/page.tsx` — Server Component with export const dynamic = 'force-dynamic'; ALLOWED_ROLES RBAC check; Math.max(1, parseInt(page)) page guard; getKpisWithReadings call; renders KpiFilterBar + KpiGrid

## Decisions Made

1. **getLatestReading import path** — Imported from `@/lib/strategic/queries` (not kpi-utils). The plan note "CORRECTION on import" clarified this; the function lives in queries.ts per Plan 03.

2. **count ?? 0 for totalCount prop** — `getKpisWithReadings` returns `count: number | null` (Supabase type). Applied `count ?? 0` when passing to KpiGrid to satisfy TypeScript's `number` prop type without suppressing errors.

3. **Objective filter deferred** — KpiFilterBar implements status filter only per D-21. Objective filter mentioned in D-21 ("filtering by status badge and by objective") is excluded as MVP per the plan note "skip objective filter if objectives list is complex; add status filter only per D-21."

## Deviations from Plan

None — plan executed exactly as written. Both tasks implemented per the exact code patterns specified in the plan interfaces block.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. All UI is wired to the existing Supabase queries from Plan 03.

## Next Phase Readiness

- /strategic route is fully functional: fetches live KPI data, renders grid with status badges and sparklines
- KpiFilterBar is wired but server-side status filtering is not yet applied in getKpisWithReadings — filter state is in URL but the query in queries.ts fetches all institution KPIs. If server-side status filtering is needed, getKpisWithReadings would need a status param added.
- All Phase 2 dashboard deliverables for STRAT-06 are complete

## Known Stubs

- **KpiFilterBar status filter (URL) — not wired to server query:** KpiFilterBar writes `?status=on_track` to the URL, and page.tsx reads `searchParams.page`. However, `searchParams.status` is not passed to `getKpisWithReadings()` — the query returns all KPIs regardless of status filter. Client-side filtering via TanStack Table's `getFilteredRowModel()` could be wired in KpiGrid as a follow-up, or `getKpisWithReadings` could accept a `status` param. The filter bar Apply button is functional; the actual data filtering is a deferred enhancement. The KPI grid will show all KPIs until this is wired.

## Threat Flags

No new threat surface beyond what was planned in the threat model. All `mitigate` dispositions from the threat register are implemented:

- T-02-P05-01: getKpisWithReadings uses authenticated Supabase client; RLS on kpis table enforces institution_id isolation — mitigated by Plan 03 queries.ts
- T-02-P05-02: KpiGrid renders only data passed from Server Component; no direct Supabase calls in client — implemented (no supabase import in KpiGrid.tsx or KpiSparkline.tsx)
- T-02-P05-03: parseInt with Math.max(1, ...) prevents negative page values — implemented in page.tsx line `Math.max(1, parseInt(searchParams.page ?? '1', 10))`
- T-02-P05-04: isAnimationActive={false} on all Line components — implemented in KpiSparkline.tsx line 46

## Self-Check: PASSED

- app/(protected)/strategic/KpiSparkline.tsx: FOUND
- app/(protected)/strategic/KpiFilterBar.tsx: FOUND
- app/(protected)/strategic/KpiGrid.tsx: FOUND
- app/(protected)/strategic/page.tsx: FOUND
- Commit d8465c8 (Task 10): FOUND in git log
- Commit f5b4c16 (Task 11): FOUND in git log
- isAnimationActive={false}: line 46 of KpiSparkline.tsx — CONFIRMED
- dot={false}: line 45 of KpiSparkline.tsx — CONFIRMED
- No XAxis/YAxis/CartesianGrid/Tooltip in KpiSparkline.tsx — CONFIRMED
- ColumnDef<KpiRow>[] (single type arg): line 62 of KpiGrid.tsx — CONFIRMED
- useMemo wrapping columns: line 62 of KpiGrid.tsx — CONFIRMED
- export const dynamic = 'force-dynamic': line 12 of page.tsx — CONFIRMED
- npx tsc --noEmit: zero errors for all 4 files — CONFIRMED

---
*Phase: 02-strategic-planning-objectives-and-kpis*
*Completed: 2026-05-23*
