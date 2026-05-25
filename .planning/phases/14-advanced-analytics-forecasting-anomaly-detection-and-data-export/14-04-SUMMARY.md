---
phase: 14-advanced-analytics-forecasting-anomaly-detection-and-data-export
plan: "04"
subsystem: analytics
tags: [anomaly-detection, statistics, cron, email, notifications, vercel]
dependency_graph:
  requires: ["14-01", "14-02"]
  provides: ["BRIDGE-ANA-02"]
  affects: ["lib/analytics", "lib/email/templates", "app/api/analytics", "lib/notifications"]
tech_stack:
  added: []
  patterns:
    - "Population standard deviation with optional precomputed mean"
    - "Trailing 6-period window anomaly detection (2σ threshold)"
    - "25-hour dedup window (same as kri-alert.ts pattern)"
    - "Vercel native cron GET route with Authorization: Bearer {CRON_SECRET}"
    - "React Email template with GRC-Nexus branding"
    - "Resend graceful degradation (skip if key not set or is test key)"
key_files:
  created:
    - lib/analytics/anomaly.ts
    - lib/email/templates/AnomalyAlertEmail.tsx
    - app/api/analytics/anomaly-detect/route.ts
    - vercel.json
  modified: []
decisions:
  - "Used Vercel native cron (GET + Authorization: Bearer) not pg_cron (POST + x-cron-secret) — per RESEARCH.md Open Question 1 resolution"
  - "sendAnomalyAlerts() uses createAdminClient() to bypass RLS for cross-user notification recipient lookup"
  - "Skip guard: metrics with fewer than 3 readings in the 25-hour window are skipped (avoids false positives with insufficient data)"
  - "stddev=0 guard in isAnomaly: flat metrics (identical readings) never produce anomaly alerts"
  - "AnomalyAlertEmail template mirrors RoleAssignmentEmail structure: #050D1B navy header, #C8A44A gold branding"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-25"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
requirements:
  - BRIDGE-ANA-02
---

# Phase 14 Plan 04: Anomaly Detection Service, Email Template, Cron Route, and Vercel Config Summary

**One-liner:** Daily statistical anomaly detection (2σ trailing 6-period) for KPI/KRI readings with in-app notifications, Resend email alerts, and Vercel native cron schedule.

## Tasks Completed

| Task | Name | Status | Files |
|------|------|--------|-------|
| 1 | Implement lib/analytics/anomaly.ts — stats utilities and anomaly detection service | DONE | lib/analytics/anomaly.ts |
| 2 | Create AnomalyAlertEmail template, anomaly-detect GET route, and vercel.json | DONE | lib/email/templates/AnomalyAlertEmail.tsx, app/api/analytics/anomaly-detect/route.ts, vercel.json |

## What Was Built

### lib/analytics/anomaly.ts

Pure statistical utility functions + anomaly detection service:

- **`mean(values: number[]): number`** — arithmetic mean of a numeric array
- **`stddev(values: number[], mu?: number): number`** — population standard deviation with optional precomputed mean for efficiency
- **`isAnomaly(value, m, s, threshold=2): boolean`** — returns true if `|value - mean| > threshold * stddev`; CRITICAL GUARD: returns false when stddev === 0 (flat metrics never trigger anomalies)
- **`sendAnomalyAlerts(): Promise<{ sent, skipped }>`** — queries kpi_readings and kri_readings from last 25 hours, groups by metric, skips groups with <3 readings, computes trailing 6-period mean/stddev, flags latest reading if anomalous, inserts in-app notifications, sends Resend emails with graceful degradation

### lib/email/templates/AnomalyAlertEmail.tsx

React Email template matching GRC-Nexus brand:
- Header: `#050D1B` dark navy, `#C8A44A` gold text
- Body: white card with `#F3F7FD` info box showing metric title, type, period, actual value, 6-period mean, standard deviation
- CTA link: `#C8A44A` gold button to KPI/KRI detail page

### app/api/analytics/anomaly-detect/route.ts

Vercel native cron GET route:
- Exports `GET` (not POST) — Vercel cron sends GET requests
- Authorization guard is FIRST operation: `Authorization: Bearer {CRON_SECRET}` header required
- Returns `{ success, anomaliesFound, skipped }` on success, 401 on auth failure, 500 on unexpected error

### vercel.json

Created at project root with Vercel cron schedule:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/analytics/anomaly-detect",
      "schedule": "0 6 * * *"
    }
  ]
}
```
Schedule: 6:00 AM UTC daily.

## Test Results

- `npm test -- lib/analytics/anomaly`: **7/7 PASSED** (all Wave 0 tests GREEN)
- `npm test` full suite: **156 passed**, 3 pre-existing failures (unrelated to this plan — see Deferred Issues)

## Deviations from Plan

None — plan executed exactly as written.

## Deferred Issues (Pre-existing, Out of Scope)

Pre-existing test failures that existed before this plan and are not caused by any changes in this plan:

1. **tests/e2e/accessible-screenshots.spec.ts** — Playwright test called inside Vitest runner (framework conflict). Pre-existing issue.
2. **tests/e2e/training-video.spec.ts** — Same Playwright/Vitest framework conflict. Pre-existing issue.
3. **tests/incidents/incident-contracts.test.ts** (3 tests) — `isValidIncidentStatusTransition` returns false for transitions that tests expect true (`new→closed`, `assigned→closed`, `in_investigation→closed`). Pre-existing incident state machine logic mismatch.

These are logged in `deferred-items.md` scope and not touched.

## Security Notes

Per threat model T-14-01: Authorization header check is the FIRST operation in the GET handler — no DB calls or computation occur before the auth gate. The admin client in `sendAnomalyAlerts()` bypasses RLS intentionally (required for cross-institution admin recipient lookup, following the verified kri-alert.ts pattern).

## Self-Check

- [x] `lib/analytics/anomaly.ts` exists — FOUND
- [x] `lib/email/templates/AnomalyAlertEmail.tsx` exists — FOUND
- [x] `app/api/analytics/anomaly-detect/route.ts` exists — FOUND
- [x] `vercel.json` exists at project root — FOUND
- [x] All 7 anomaly tests pass — VERIFIED (npm test -- lib/analytics/anomaly)
- [x] `export function mean` in anomaly.ts — VERIFIED
- [x] `export function stddev` in anomaly.ts — VERIFIED
- [x] `export function isAnomaly` in anomaly.ts — VERIFIED
- [x] `export async function sendAnomalyAlerts` in anomaly.ts — VERIFIED
- [x] `s === 0` guard in anomaly.ts — VERIFIED (line 29)
- [x] `25 * 60 * 60` window in anomaly.ts — VERIFIED (line 42)
- [x] `#C8A44A` in AnomalyAlertEmail.tsx — VERIFIED (lines 60, 136)
- [x] `#050D1B` in AnomalyAlertEmail.tsx — VERIFIED (lines 53, 137)
- [x] `export async function GET` in route.ts — VERIFIED (line 12)
- [x] `Authorization` in route.ts — VERIFIED (lines 3, 4)
- [x] No `export async function POST` in route.ts — VERIFIED (no match)
- [x] `crons` in vercel.json — VERIFIED
- [x] `anomaly-detect` in vercel.json — VERIFIED
- [x] `0 6 * * *` in vercel.json — VERIFIED

## Self-Check: PASSED
