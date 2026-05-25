---
phase: 14-advanced-analytics-forecasting-anomaly-detection-and-data-export
plan: "03"
subsystem: analytics-export
tags: [csv-export, admin, api-route, rls, accordion, shadcn]
dependency_graph:
  requires:
    - "14-01: Wave 0 TDD stubs (establishes test baseline)"
  provides:
    - "RLS-scoped 9-module CSV export API (GET /api/analytics/export/[module])"
    - "Admin analytics-export page with download table and API docs accordion"
  affects:
    - "app/(protected)/admin/analytics-export"
    - "app/api/analytics/export/[module]"
    - "components/ui/accordion"
tech_stack:
  added:
    - "@radix-ui/react-accordion (via shadcn add accordion)"
  patterns:
    - "RLS-scoped user client CSV export (mirrors app/api/audit/export pattern)"
    - "ALLOWED_MODULES allowlist for path traversal prevention"
    - "Shadcn Accordion for collapsible API documentation"
    - "Admin-only gate via app/(protected)/admin/layout.tsx (no per-page redirect)"
key_files:
  created:
    - "app/api/analytics/export/[module]/route.ts"
    - "app/(protected)/admin/analytics-export/page.tsx"
    - "components/ui/accordion.tsx"
  modified:
    - "tailwind.config.ts (accordion keyframes added by shadcn CLI)"
decisions:
  - "Used createClient() user client (NOT createAdminClient) to enforce RLS institution_id scoping per T-14-02 threat mitigation"
  - "incidents module omits submitter_id column per INCD-02 anonymity requirement"
  - "9-slug ALLOWED_MODULES allowlist validates params.module before any DB query per T-14-03 path traversal mitigation"
  - "Admin auth delegated to app/(protected)/admin/layout.tsx — no per-page redirect added (accepted per T-14-03-C)"
metrics:
  duration: "~9 minutes"
  completed: "2026-05-25T00:50:40Z"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 14 Plan 03: Analytics CSV Export API and Admin Page Summary

**One-liner:** Admin-only 9-module CSV export via RLS-scoped user client with allowlist path traversal prevention, plus shadcn Accordion API docs page at /admin/analytics-export.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | RLS-scoped 9-module CSV export API route | `4ee2a60` | `app/api/analytics/export/[module]/route.ts` |
| 2 | shadcn accordion install + analytics-export admin page | `7bff95b` | `app/(protected)/admin/analytics-export/page.tsx`, `components/ui/accordion.tsx` |
| — | tailwind.config.ts accordion keyframes (shadcn side-effect) | `16e5f38` | `tailwind.config.ts` |

## What Was Built

### Task 1: `app/api/analytics/export/[module]/route.ts`

A single dynamic route handler serving CSV exports for 9 governance modules. Key security properties:

- **RLS enforcement:** Uses `createClient()` (user client) — never `createAdminClient`. Supabase RLS automatically scopes all queries to the authenticated user's `institution_id`.
- **Path traversal prevention:** `params.module` validated against `ALLOWED_MODULES` const (`['risks', 'kpis', 'kris', 'kcis', 'obligations', 'findings', 'incidents', 'board-actions', 'esg']`) before any database call. Returns 404 for any non-allowlisted value.
- **Auth checks:** 401 for unauthenticated, 403 for authenticated non-admin (`active_role !== 'admin'`).
- **Cache prevention:** `Cache-Control: no-store, no-cache, must-revalidate` on all responses.
- **CSV encoding:** `escapeCSV()` helper wraps all fields in double-quotes and escapes internal quotes as `""` per RFC 4180.
- **Joined queries:** kpis, kris, kcis, and esg modules flatten one row per reading; if no readings exist, one row with empty reading fields is emitted.
- **Anonymity:** `incidents` module omits `submitter_id` per INCD-02.

### Task 2: `app/(protected)/admin/analytics-export/page.tsx`

Server component admin page at `/admin/analytics-export`:

- **Export table:** 9-row HTML table (native `<table>` matching audit-log pattern) with Module, Records Exported, Format, and Download CSV action columns. Each row links to `/api/analytics/export/[slug]`.
- **Accordion API docs:** shadcn `Accordion` with 9 `AccordionItem` entries. Each item shows the endpoint path and the CSV column schema as inline `<code>` badges.
- **No auth redirect:** Inherits admin gate from `app/(protected)/admin/layout.tsx`.

## Security Verification

| Check | Result |
|-------|--------|
| `grep "createAdminClient" route.ts` | No matches — confirmed |
| `grep "ALLOWED_MODULES" route.ts` | Present — allowlist validates before DB |
| `grep "no-store" route.ts` | Present — cache prevention active |
| `grep "force-dynamic" route.ts` | Present |
| `grep "force-dynamic" page.tsx` | Present |

## Deviations from Plan

### Side-Effect: tailwind.config.ts Modified by shadcn CLI

**Found during:** Task 2 (shadcn accordion install)
**Issue:** `npx shadcn add accordion` modified `tailwind.config.ts` to add `accordion-down` and `accordion-up` keyframe animations. It also reformatted the file (spaces → tabs, stripped comments).
**Fix:** All existing GRC-Nexus design tokens preserved (`navy-950`, `navy-900`, `navy-mid`, `paper`, `paper-border`, `gold`, etc.). Committed the reformatted file as a separate `chore` commit.
**Files modified:** `tailwind.config.ts`
**Commit:** `16e5f38`

No other deviations — plan executed as written.

## Known Stubs

None. All 9 module routes query live Supabase tables via the user client. The page renders links that trigger real CSV downloads.

## Threat Flags

None beyond the plan's threat model. No new network endpoints, auth paths, or trust boundary changes beyond those specified in T-14-02, T-14-03, T-14-03-B, and T-14-03-C.

## Self-Check

Files exist:
- `app/api/analytics/export/[module]/route.ts` — FOUND
- `app/(protected)/admin/analytics-export/page.tsx` — FOUND
- `components/ui/accordion.tsx` — FOUND

Commits exist:
- `4ee2a60` — FOUND (Task 1 route)
- `7bff95b` — FOUND (Task 2 page + accordion)
- `16e5f38` — FOUND (tailwind side-effect)

Test suite: 4 failed / 17 passed (152 total tests, 3 failed) — same as pre-plan baseline. No regressions introduced.

## Self-Check: PASSED
