# Phase 2: Strategic Planning — Objectives and KPIs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 02-strategic-planning-objectives-and-kpis
**Mode:** Autonomous (all decisions pre-specified by user — no interactive Q&A)
**Areas decided:** NDS2 Pillars, Objective Data Model, KPI Data Model, Period Readings, Performance Thresholds, Dashboard Grid, RBAC, RLS, Routing

---

## NDS2 Pillar Taxonomy

| Option | Description | Selected |
|--------|-------------|----------|
| 8 NDS2 pillars as Postgres enum | Economic Transformation, Social Development, Infrastructure Development, Environmental Sustainability, Governance & Institutions, Innovation & Technology, Regional & International Integration, Rural & Urban Development | ✓ |
| Free-text pillar field | Allow any pillar name — flexible but uncontrolled | |
| Separate pillars lookup table | Supports hierarchy but overkill for Phase 2 | |

**User's choice:** 8 NDS2 pillars as a typed Postgres enum `nds2_pillar`
**Notes:** Pillar hierarchy (pillar → outcome → output) explicitly deferred to v2 per REQUIREMENTS.md.

---

## Objective Status Values

| Option | Description | Selected |
|--------|-------------|----------|
| Draft, Active, At Risk, Completed, Cancelled | Five-state lifecycle matching governance workflows | ✓ |
| Active, Completed, Cancelled (three-state) | Simpler but loses draft and at-risk signals | |

**User's choice:** Five-state: `draft`, `active`, `at_risk`, `completed`, `cancelled`
**Notes:** `at_risk` at the objective level is distinct from KPI performance status — an objective can be at risk even if individual KPIs are on track (e.g., strategic context change).

---

## Objective Hierarchy

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list per institution | Simple, no parent-child linking | ✓ |
| Parent-child nesting | Supports sub-objectives — Phase 2+ extension | |

**User's choice:** Flat list — no hierarchy in Phase 2
**Notes:** Hierarchy is a v2 extension. The `institutional_goal` free-text field provides some grouping without requiring a formal hierarchy schema.

---

## KPI Performance Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| 90%/70% hardcoded thresholds | On Track ≥90%, At Risk 70–89%, Off Track <70% | ✓ |
| Configurable per institution | Flexible but adds configuration UI complexity | |
| 80%/60% thresholds | More lenient — common in some frameworks | |

**User's choice:** 90%/70% hardcoded constants in `lib/strategic/kpi-utils.ts`
**Notes:** KPIs with no readings show `No Data` status (neutral). Configurability deferred to v2.

---

## Reporting Frequency

| Option | Description | Selected |
|--------|-------------|----------|
| Monthly, Quarterly, Semi-Annual, Annual | Four frequencies as Postgres enum | ✓ |
| Weekly + Monthly + Quarterly + Annual | More granular — adds complexity without governance value | |

**User's choice:** Four-value enum: `monthly`, `quarterly`, `semi_annual`, `annual`
**Notes:** Weekly KPI reporting is not standard in NDS2 public sector context.

---

## Period Reading Format

| Option | Description | Selected |
|--------|-------------|----------|
| ISO-period labels (YYYY-Q#, YYYY-M##, etc.) | Human-readable, governance-standard notation | ✓ |
| Date range (start/end dates) | More precise but more complex to input and display | |
| Sequential integer (reading #1, #2, …) | Simple but loses temporal meaning | |

**User's choice:** ISO-period label string: `2026-Q1`, `2026-M03`, `2026-H1`, `2026`
**Notes:** Validated with Zod regex per frequency type. Format aligns with NDS2 reporting conventions.

---

## KPI Chart Type

| Option | Description | Selected |
|--------|-------------|----------|
| Recharts LineChart (mini sparkline) | Consistent with stack; shows trend over last 6 readings | ✓ |
| Nivo line chart | Richer but heavier; Nivo reserved for heatmaps (Phase 3) | |
| CSS-only bar chart | No library dependency but limited | |

**User's choice:** Recharts `<LineChart>` as mini sparkline (no axes, no labels, last 6 readings)
**Notes:** Recharts is already in the stack from Phase 1 research. Full reading history on KPI detail page.

---

## Who Can Create Objectives

| Option | Description | Selected |
|--------|-------------|----------|
| admin + ceo only | Matches RBAC spec — strategic objective creation is executive | ✓ |
| admin + ceo + risk-officer | Risk officers manage strategic alignment | |
| Any authenticated user | Too permissive for governance context | |

**User's choice:** `admin` and `ceo` roles only

---

## Who Can Create KPIs

| Option | Description | Selected |
|--------|-------------|----------|
| admin + ceo + risk-officer | KPI creation is a strategic alignment task | ✓ |
| admin only | Too restrictive — risk officers own KPI frameworks | |

**User's choice:** `admin`, `ceo`, `risk-officer`

---

## Who Can Record Period Readings

| Option | Description | Selected |
|--------|-------------|----------|
| KPI owner (any role) + admin | Owner accountability; admin override | ✓ |
| Any authenticated user | Too permissive | |
| Only the KPI owner | No admin override — too rigid | |

**User's choice:** KPI `owner_id` (regardless of role) plus `admin` role

---

## Dashboard KPI Grid Design

| Option | Description | Selected |
|--------|-------------|----------|
| TanStack Table with status + objective filters, sparkline column, 20 rows/page | Consistent with Phase 1 audit log pattern | ✓ |
| Simple card grid, no table | Less scannable for large KPI sets | |
| Grouped by objective (accordion) | Richer but more complex — deferred | |

**User's choice:** TanStack Table, columns: Title, Objective, Owner, Last Reading, Status Badge, Trend Sparkline, Frequency. Client-side filter by status and objective. 20 rows/page.

---

## RLS Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| institution_id isolation (same as Phase 1) | All three new tables use same RLS pattern | ✓ |
| Application-layer only | Violates security model | |

**User's choice:** RLS enabled on all three tables (`strategic_objectives`, `kpis`, `kpi_readings`) with `institution_id` isolation. Audit triggers via `audit.attach_audit_trigger()`.

---

## Claude's Discretion

The following areas were explicitly delegated to Claude during planning/implementation:
- Exact form layout details, field order, helper text copy, placeholder text
- Pagination behavior (offset-based, consistent with TanStack Table pattern already in use)
- Loading skeleton design for KPI grid
- Empty state illustration/icon choice
- Recharts sparkline styling (stroke width, dot size, color)
- Migration timestamp selection

## Deferred Ideas

- NDS2 hierarchical pillar taxonomy — v2
- Objective approval workflow — v2
- Cross-institution KPI comparison — v2
- Configurable performance thresholds per institution — v2
- Automated KPI reading reminders/notifications — Phase 8
- Time-varying KPI targets (milestone targets per period) — v2
- Institutional 5-year goal lookup table — v2
- Bulk CSV import — not in STRAT requirements
- PDF export of KPI summary — Phase 8 (RPT-03)
