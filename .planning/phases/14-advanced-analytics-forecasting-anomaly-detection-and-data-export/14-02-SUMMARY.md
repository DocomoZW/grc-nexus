---
phase: 14-advanced-analytics-forecasting-anomaly-detection-and-data-export
plan: "02"
subsystem: analytics
tags: [forecast, recharts, notifications, typescript, ols]
dependency_graph:
  requires:
    - "14-01"
  provides:
    - lib/analytics/forecast.ts
    - components/analytics/ForecastChart.tsx
    - types/notifications.ts (extended)
  affects:
    - "14-04 (page integrations consume ForecastChart + forecastPoints)"
    - "14-03 (anomaly cron uses SourceModule 'analytics')"
tech_stack:
  added: []
  patterns:
    - "Pure TypeScript OLS linear regression (period-index encoding, no external deps)"
    - "Recharts ComposedChart + ReferenceArea for forecast band visualization"
    - "SourceModule union extension pattern (additive, no migration needed)"
key_files:
  created:
    - lib/analytics/forecast.ts
    - components/analytics/ForecastChart.tsx
  modified:
    - types/notifications.ts
decisions:
  - "OLS period-index encoding (x = 0..n-1) chosen over date-based encoding — avoids date parsing edge cases across KPI frequencies"
  - "Residual stddev used as uncertainty measure for forecast band — acceptable for prototype; no external math library needed"
  - "ifOverflow=extendDomain on ReferenceArea — prevents band clipping when forecast values fall outside data domain"
  - "connectNulls={false} on Line — forecast periods with null values break the line rather than connect across gaps"
metrics:
  duration_seconds: 160
  completed_date: "2026-05-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 14 Plan 02: Analytics Foundation — Forecast Utility, ForecastChart Component, SourceModule Extension Summary

**One-liner:** Pure TypeScript OLS linear regression utility, Recharts ComposedChart forecast band component, and SourceModule union extended with 'analytics' for notification routing.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement lib/analytics/forecast.ts — pure OLS linear regression utility | 9769d74 | lib/analytics/forecast.ts |
| 2 | Create ForecastChart client component and extend SourceModule type | 8f32484 | components/analytics/ForecastChart.tsx, types/notifications.ts |

---

## What Was Built

### Task 1 — `lib/analytics/forecast.ts`

Pure TypeScript OLS linear regression utility with period-index encoding. Two exports:

- `linearRegression(values: number[])` — computes slope and intercept via OLS; denominator === 0 guard returns slope=0 for all-same inputs (prevents division by zero)
- `forecastPoints(readings: number[], horizon: number)` — returns `{ lower, upper }[]` for each forecast period using residual standard deviation as the uncertainty measure

All 7 Vitest tests in `lib/analytics/forecast.test.ts` pass GREEN. No external dependencies added.

### Task 2A — `components/analytics/ForecastChart.tsx`

Recharts `ComposedChart` client component (200px height):
- `'use client'` directive — Recharts requires browser SVG APIs
- `ReferenceArea` with `y1`/`y2` gold band (`#C8A44A`, `fillOpacity=0.15`) and `ifOverflow="extendDomain"` to prevent clipping
- `ReferenceLine` for target value (dashed navy)
- `Line` with `isAnimationActive={false}` (matches KpiSparkline.tsx pattern) and `connectNulls={false}` (breaks line at null forecast periods)
- `role="img"` and `aria-label="Forecast chart"` for accessibility
- Directory `components/analytics/` created new

### Task 2B — `types/notifications.ts`

Two additive changes only:
- `SourceModule` union extended with `| 'analytics'` (after `| 'system'`)
- `SOURCE_MODULE_LABELS` extended with `analytics: 'Analytics'`
- No migration required — `notifications.source_module` column is unconstrained `text`

---

## Verification Results

```
npm test -- lib/analytics/forecast   → 7/7 PASS
npm test (full suite)                → same failure count as pre-plan baseline (4 files, 3 tests — all pre-existing)

grep "export function linearRegression" lib/analytics/forecast.ts   → MATCH
grep "export function forecastPoints" lib/analytics/forecast.ts     → MATCH
grep "denominator === 0" lib/analytics/forecast.ts                  → MATCH
grep "'use client'" components/analytics/ForecastChart.tsx          → MATCH
grep "ReferenceArea" components/analytics/ForecastChart.tsx         → MATCH
grep "isAnimationActive={false}" components/analytics/ForecastChart.tsx → MATCH
grep "ifOverflow" components/analytics/ForecastChart.tsx            → MATCH
grep "| 'analytics'" types/notifications.ts                         → MATCH
grep "analytics: 'Analytics'" types/notifications.ts               → MATCH
```

Pre-existing test failures (not caused by this plan):
- `lib/analytics/anomaly.test.ts` — Wave 0 stub; `lib/analytics/anomaly.ts` not yet created (Plan 14-03)
- `tests/e2e/accessible-screenshots.spec.ts` — Playwright test in Vitest runner (infrastructure issue, pre-existing)
- `tests/e2e/training-video.spec.ts` — Playwright test in Vitest runner (infrastructure issue, pre-existing)
- `tests/incidents/incident-contracts.test.ts` — 3 failing assertions (pre-existing, unrelated to this plan)

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — `ForecastChart` accepts pre-computed props (no hardcoded empty values); `forecast.ts` is pure math with no stubs.

---

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary crossings introduced. All threat model dispositions from plan are `accept` as documented.

---

## Self-Check: PASSED

- `lib/analytics/forecast.ts` — FOUND
- `components/analytics/ForecastChart.tsx` — FOUND
- `types/notifications.ts` — FOUND (with both additions)
- Commit 9769d74 — FOUND (Task 1)
- Commit 8f32484 — FOUND (Task 2)
