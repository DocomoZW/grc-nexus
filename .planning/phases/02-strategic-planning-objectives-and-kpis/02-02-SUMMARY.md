---
phase: "02-strategic-planning-objectives-and-kpis"
plan: "02"
subsystem: "strategic-planning"
tags: [typescript, zod, vitest, tdd, kpi, pure-functions, schemas]

requires:
  - phase: "02-01"
    provides: "strategic_objectives, kpis, kpi_readings DB tables; recharts and @tanstack/react-table installed"
  - phase: "01-01"
    provides: "auth patterns, Zod v3 schema style (lib/schemas/auth.ts reference)"

provides:
  - "types/strategic.ts: Nds2Pillar union, NDS2_PILLAR_LABELS, ObjectiveStatus, KpiFrequency, StrategicObjective, Kpi, KpiReading interfaces"
  - "lib/strategic/kpi-utils.ts: calculateKpiStatus pure function, KPI_STATUS_BADGE, threshold constants (KPI_ON_TRACK_THRESHOLD=0.90, KPI_AT_RISK_THRESHOLD=0.70)"
  - "lib/schemas/strategic.ts: objectiveSchema (with .refine() cross-field), kpiSchema (numericField helper), kpiReadingSchema; inferred types ObjectiveInput, KpiInput, KpiReadingInput"
  - "tests/strategic/kpi-utils.test.ts: 12 unit tests covering all calculateKpiStatus branches and edge cases"
  - "tests/strategic/schemas.test.ts: 27 unit tests for all three schemas"

affects:
  - "02-03: Server Actions (lib/strategic/actions.ts) consume objectiveSchema, kpiSchema, kpiReadingSchema"
  - "02-04: UI forms use ObjectiveInput, KpiInput, KpiReadingInput types"
  - "02-05: KPI dashboard uses calculateKpiStatus, KPI_STATUS_BADGE for status display"
  - "02-06: All subsequent plans depend on these type contracts"

tech-stack:
  added: []
  patterns:
    - "numericField() helper: z.preprocess + z.coerce.number() to reject empty strings AND coerce valid numerics — Zod v3 compatible (D-30 edge case fix)"
    - "objectiveSchema cross-field .refine() with path: ['nds2_pillar'] for FormMessage rendering"
    - "Pure function isolation: lib/strategic/kpi-utils.ts has zero Supabase/Next.js imports"
    - "TDD RED/GREEN cycle: test commit first, then implementation commit"

key-files:
  created:
    - "types/strategic.ts"
    - "lib/strategic/kpi-utils.ts"
    - "lib/schemas/strategic.ts"
    - "tests/strategic/kpi-utils.test.ts"
    - "tests/strategic/schemas.test.ts"
  modified: []

key-decisions:
  - "Used z.preprocess(empty-string-guard) + z.coerce.number() instead of z.coerce.number() alone — Zod v3's coerce converts '' to 0 (not NaN), so empty string coercion was silently succeeding"
  - "kpiReadingSchema uses z.string().min(1) for reporting_period (not regex per frequency) — period format validation is a UX concern handled by form helper text (D-12)"
  - "calculateKpiStatus overperform (actual > target) returns 'on_track' — ratio > 1.0 still passes the >= 0.90 threshold check (D-14)"
  - "types/supabase.ts has a pre-existing file corruption (PowerShell login message prepended); deferred to developer — not caused by this plan"

patterns-established:
  - "numericField() helper pattern: use z.preprocess for empty-string rejection before z.coerce.number() in any form schema"
  - "Pure utility functions in lib/strategic/ with zero framework imports — enables unit testing without mocks"

requirements-completed: [STRAT-01, STRAT-03, STRAT-04, STRAT-05]

duration: "41m"
completed: "2026-05-23"
---

# Phase 02 Plan 02: KPI Performance Logic and Zod v3 Strategic Schemas — TDD Summary

**Pure calculateKpiStatus function with null/zero guards, objectiveSchema cross-field refine, and kpiSchema numericField helper — all 39 unit tests green via TDD RED/GREEN cycle.**

## Performance

- **Duration:** 41 minutes
- **Started:** 2026-05-23T05:55:20Z
- **Completed:** 2026-05-23T06:36:23Z
- **Tasks:** 2 (TDD: Task 4 RED + Task 5 GREEN)
- **Files created:** 5

## Accomplishments

- Established TypeScript type contracts for the entire Strategic Planning module — interfaces mirror Postgres column names exactly (snake_case), no TypeScript enum keyword per project convention
- Implemented and fully unit-tested `calculateKpiStatus` pure function covering 12 edge cases: on_track/at_risk/off_track thresholds, overperformed (actual > target), null/undefined actual, and target=0 division-by-zero guard
- Built Zod v3 schemas for all three strategic forms with a `numericField()` helper that correctly rejects empty strings (Zod v3's `z.coerce.number()` coerces `''` to `0`, silently passing — the helper uses `z.preprocess` to reject empty first)

## Task Commits

Each task was committed atomically:

1. **Task 4: RED — failing tests** - `9660e4f` (test)
2. **Task 5: GREEN — implementation** - `7c933b6` (feat)

**Plan metadata:** _(committed after summary)_

_TDD plan: two commits — test first, then implementation._

## Files Created/Modified

- `tests/strategic/kpi-utils.test.ts` — 12 unit tests for `calculateKpiStatus`: on_track/at_risk/off_track branches, null, undefined, target=0, and overperform (actual > target) edge cases
- `tests/strategic/schemas.test.ts` — 27 unit tests: objectiveSchema refine cross-field rule, kpiSchema numeric coercion, kpiReadingSchema period validation
- `types/strategic.ts` — Nds2Pillar union type, NDS2_PILLAR_LABELS, ObjectiveStatus, KpiFrequency, StrategicObjective, Kpi, KpiReading interfaces
- `lib/strategic/kpi-utils.ts` — `calculateKpiStatus`, `KPI_STATUS_BADGE`, `KPI_ON_TRACK_THRESHOLD` (0.90), `KPI_AT_RISK_THRESHOLD` (0.70) — no Supabase/Next.js imports
- `lib/schemas/strategic.ts` — `objectiveSchema` (with .refine()), `kpiSchema`, `kpiReadingSchema`, inferred types `ObjectiveInput`, `KpiInput`, `KpiReadingInput`

## Decisions Made

1. **numericField() preprocess helper** — `z.coerce.number()` alone coerces `''` to `0` in Zod v3 (JavaScript's `Number('')` is `0`). Added `z.preprocess` to reject empty strings before coercion, matching the plan spec that empty form inputs must fail. This pattern should be reused in any future schema with numeric form inputs.

2. **kpiReadingSchema period validation** — Used `z.string().min(1)` for `reporting_period` (not regex-per-frequency). The plan's implementation rules explicitly choose the simpler approach (D-12): period format validation is a UI responsibility via form helper text. Schema only ensures the period label is non-empty.

3. **objectiveSchema .refine() path** — Set `path: ['nds2_pillar']` so react-hook-form's `<FormMessage>` renders the cross-field error under the NDS2 Pillar field. This matches Pitfall 6 from RESEARCH.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed z.coerce.number() empty string coercion silently succeeding**
- **Found during:** Task 5 (GREEN — running tests for the first time)
- **Issue:** `z.coerce.number()` in Zod v3 converts `''` to `0` (valid number), so `target_value: ''` passed schema validation when the plan requires it to fail. RESEARCH.md Pitfall 5 incorrectly states that `""` becomes NaN — in practice `Number('')` is `0`.
- **Fix:** Replaced `z.coerce.number({ invalid_type_error: '...' })` with a `numericField()` helper that uses `z.preprocess((val) => val === '' ? undefined : val, z.coerce.number(...))` to reject empty strings before coercion.
- **Files modified:** `lib/schemas/strategic.ts`
- **Verification:** 2 previously-failing tests now pass; all 39 tests green
- **Committed in:** 7c933b6 (Task 5 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary for plan's stated behavior that empty form inputs fail. No scope creep. The numericField() pattern should be used in all future form schemas with numeric inputs.

## Issues Encountered

- **Pre-existing `types/supabase.ts` corruption:** The file starts with a PowerShell login role error message prepended, causing `npx tsc --noEmit` to report parse errors on lines 1-8. This is a pre-existing issue unrelated to this plan. The three new files (`types/strategic.ts`, `lib/strategic/kpi-utils.ts`, `lib/schemas/strategic.ts`) have zero TypeScript errors when checked individually. Documented in `.planning/phases/02-strategic-planning-objectives-and-kpis/deferred-items.md`.

## User Setup Required

None — no external service configuration required. This plan delivers pure TypeScript/Zod artifacts only.

## TDD Gate Compliance

- RED gate: `test(02-02)` commit `9660e4f` — test files written, all failing (import errors)
- GREEN gate: `feat(02-02)` commit `7c933b6` — implementation written, all 39 tests passing
- REFACTOR gate: Not needed — implementation was clean on first pass

## Known Stubs

None — this plan delivers pure types, pure functions, and Zod schemas only. No UI components or data rendering paths were created.

## Threat Flags

No new threat surface beyond what was planned in the threat model. Mitigations from threat register:

- T-02-P02-01: objectiveSchema with Zod safeParse strips unknown fields — mitigated by schema design
- T-02-P02-02: kpiSchema numericField helper prevents NaN/empty strings from reaching DB numeric columns — mitigated
- T-02-P02-03: kpiReadingSchema period label — accepted (text storage, UX aid only)
- T-02-P02-04: calculateKpiStatus pure function — accepted (no data access)

## Next Phase Readiness

- All type contracts established: Plans 03–06 can import from `types/strategic.ts` and `lib/schemas/strategic.ts`
- `calculateKpiStatus` is ready for use in Server Actions and the KPI dashboard
- `KPI_STATUS_BADGE` config is ready for the `<Badge>` component in KpiGrid
- Server Actions (Plan 02-03) can import `objectiveSchema`, `kpiSchema`, `kpiReadingSchema` with full type inference
- No blockers for subsequent plans

## Self-Check: PASSED

- types/strategic.ts: FOUND
- lib/strategic/kpi-utils.ts: FOUND
- lib/schemas/strategic.ts: FOUND
- tests/strategic/kpi-utils.test.ts: FOUND
- tests/strategic/schemas.test.ts: FOUND
- Commit 9660e4f (test RED): FOUND in git log
- Commit 7c933b6 (feat GREEN): FOUND in git log
- All 39 tests passing: CONFIRMED

---
*Phase: 02-strategic-planning-objectives-and-kpis*
*Completed: 2026-05-23*
