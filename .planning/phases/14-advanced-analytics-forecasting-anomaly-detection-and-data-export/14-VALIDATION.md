---
phase: 14
slug: advanced-analytics-forecasting-anomaly-detection-and-data-export
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-25
completed: 2026-05-25
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | BRIDGE-ANA-01 | — | N/A | unit | `npm test -- lib/analytics/forecast` | ❌ Wave 0 | ⬜ pending |
| 14-01-02 | 01 | 1 | BRIDGE-ANA-01 | — | N/A | unit | `npm test -- lib/analytics/forecast` | ❌ Wave 0 | ⬜ pending |
| 14-01-03 | 01 | 1 | BRIDGE-ANA-01 | — | N/A | unit | `npm test -- lib/analytics/forecast` | ❌ Wave 0 | ⬜ pending |
| 14-02-01 | 02 | 1 | BRIDGE-ANA-02 | T-14-01 | Anomaly cron requires Authorization: Bearer header | unit | `npm test -- lib/analytics/anomaly` | ❌ Wave 0 | ⬜ pending |
| 14-02-02 | 02 | 1 | BRIDGE-ANA-02 | — | N/A | unit | `npm test -- lib/analytics/anomaly` | ❌ Wave 0 | ⬜ pending |
| 14-03-01 | 03 | 2 | BRIDGE-ANA-03 | T-14-02 | Export route returns 401 for unauthenticated | manual | Manual: `curl localhost:3000/api/analytics/export/risks` → 401 | N/A | ⬜ pending |
| 14-04-01 | 04 | 2 | BRIDGE-ANA-04 | — | N/A | component | `npm test -- analytics-export` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/analytics/forecast.test.ts` — unit tests for `linearRegression()` and `forecastPoints()` covering BRIDGE-ANA-01 (correct output, edge cases: < 4 readings returns null, all-same values)
- [ ] `lib/analytics/anomaly.test.ts` — unit tests for anomaly detection logic covering BRIDGE-ANA-02 (>2σ flagging, skips metrics with < 3 readings, 25-hour dedup window)

*Existing infrastructure covers remaining gaps: `tests/setup.ts`, `vitest.config.ts`, `@` alias.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSV export returns 401 for unauthenticated request | BRIDGE-ANA-03 | Requires live Supabase auth session | `curl -X GET http://localhost:3000/api/analytics/export/risks` should return 401 |
| Forecast band renders on KPI detail page with ≥4 readings | BRIDGE-ANA-01 | Visual chart rendering requires browser | Navigate to a KPI with ≥4 readings and verify gold ReferenceArea appears |
| Download CSV button triggers browser file download | BRIDGE-ANA-03 | Browser download behavior not testable in Vitest | Click "Download CSV" for any module and verify .csv file is saved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
