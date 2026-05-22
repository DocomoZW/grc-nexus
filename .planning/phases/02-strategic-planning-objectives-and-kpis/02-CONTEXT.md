# Phase 2: Strategic Planning — Objectives and KPIs - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the full Strategic Planning module for GRC-Nexus: admins and CEOs can create institutional strategic objectives aligned to Zimbabwe's NDS2 2026–2030 pillars or institutional 5-year goals, assign owners, dates, and status. Linked KPIs can be created with baseline/target values, unit of measure, and reporting frequency. KPI owners record period readings, the system calculates On Track / At Risk / Off Track status, and a dashboard KPI summary grid displays status colors and trend sparklines.

This phase does NOT include: NDS2 pillar hierarchy management, objective approval workflows, cross-institution comparison, or executive consolidated reporting (Phase 8). All tables are scoped to `institution_id` using the RLS pattern established in Phase 1.

</domain>

<decisions>
## Implementation Decisions

### NDS2 Pillar Taxonomy

- **D-01:** The 8 NDS2 2026–2030 pillars are stored as a Postgres enum `nds2_pillar`:
  1. `economic_transformation` — Economic Transformation
  2. `social_development` — Social Development
  3. `infrastructure_development` — Infrastructure Development
  4. `environmental_sustainability` — Environmental Sustainability
  5. `governance_and_institutions` — Governance & Institutions
  6. `innovation_and_technology` — Innovation & Technology
  7. `regional_and_international_integration` — Regional & International Integration
  8. `rural_and_urban_development` — Rural & Urban Development
- **D-02:** Objectives can be tagged to either a NDS2 pillar OR an institutional 5-year goal — both are optional tags; at least one must be set. Institutional 5-year goals are stored as a free-text field (`institutional_goal text`) rather than a separate lookup table in Phase 2.
- **D-03:** NDS2 pillar hierarchy management (pillar → outcome → output taxonomy) is deferred to v2 per REQUIREMENTS.md.

### Objective Data Model

- **D-04:** `strategic_objectives` table columns: `id uuid`, `institution_id uuid`, `title text`, `description text`, `owner_id uuid` (references `auth.users`), `start_date date`, `target_date date`, `status objective_status`, `nds2_pillar nds2_pillar nullable`, `institutional_goal text nullable`, `created_by uuid`, `created_at timestamptz`, `updated_at timestamptz`.
- **D-05:** Objective status enum `objective_status`: `draft`, `active`, `at_risk`, `completed`, `cancelled`.
- **D-06:** Objective hierarchy is flat — no parent-child nesting in Phase 2. Hierarchy is a v2 extension (listed in REQUIREMENTS.md v2 deferred items).
- **D-07:** Who can create objectives: `admin` and `ceo` roles only (per RBAC spec). `risk-officer` can view but not create.

### KPI Data Model

- **D-08:** `kpis` table columns: `id uuid`, `institution_id uuid`, `objective_id uuid` (FK to `strategic_objectives`), `title text`, `description text`, `owner_id uuid`, `baseline_value numeric`, `target_value numeric`, `unit_of_measure text`, `reporting_frequency kpi_frequency`, `created_by uuid`, `created_at timestamptz`, `updated_at timestamptz`.
- **D-09:** Reporting frequency enum `kpi_frequency`: `monthly`, `quarterly`, `semi_annual`, `annual`.
- **D-10:** Who can create KPIs: `admin`, `ceo`, `risk-officer` — they manage strategic alignment.

### KPI Period Readings

- **D-11:** `kpi_readings` table columns: `id uuid`, `kpi_id uuid`, `institution_id uuid`, `reporting_period text` (label in ISO-period format, e.g., `"2026-Q1"`, `"2026-M03"`, `"2026-H1"`, `"2026"`), `actual_value numeric`, `notes text nullable`, `recorded_by uuid`, `recorded_at timestamptz`.
- **D-12:** Period label format examples by frequency: Monthly → `YYYY-M##` (e.g., `2026-M03`); Quarterly → `YYYY-Q#` (e.g., `2026-Q1`); Semi-Annual → `YYYY-H#` (e.g., `2026-H1`); Annual → `YYYY` (e.g., `2026`). These are validated with a Zod regex on input.
- **D-13:** Who can record period readings: the KPI's `owner_id` (any role) plus `admin`. The Server Action enforces this check via `active_role` from JWT claims.

### KPI Performance Status Calculation

- **D-14:** Performance status is calculated on-the-fly (not stored) using the latest reading's `actual_value` vs the KPI's `target_value`:
  - **On Track:** `actual_value >= target_value * 0.90` (actual is 90%+ of target)
  - **At Risk:** `actual_value >= target_value * 0.70` and `actual_value < target_value * 0.90` (70–89% of target)
  - **Off Track:** `actual_value < target_value * 0.70` (below 70% of target)
- **D-15:** Performance status for KPIs with no readings yet is shown as `No Data` (neutral badge, no color).
- **D-16:** Thresholds (90%, 70%) are hardcoded constants in `lib/strategic/kpi-utils.ts` — not configurable per institution in Phase 2.

### Dashboard KPI Summary Grid (STRAT-06)

- **D-17:** The KPI dashboard is a page at `app/(protected)/strategic/page.tsx` — it shows all institution KPIs in a summary grid.
- **D-18:** KPI grid columns: KPI Title, Linked Objective, Owner, Last Reading (value + period), Performance Status (colored badge), Trend Sparkline, Reporting Frequency.
- **D-19:** Status badge colors using existing Tailwind tokens: `ok` (#27AE60) for On Track, `warn` (#E67E22) for At Risk, `err` (#E74C3C) for Off Track, `paper-border` (#D7E2EF) for No Data.
- **D-20:** Trend sparkline uses Recharts `<LineChart>` (mini, no axes, no labels) — shows up to last 6 readings. Recharts is already in the stack per Phase 1 research.
- **D-21:** KPI grid is built with TanStack Table (same pattern as the audit log viewer from Phase 1). It supports client-side filtering by status badge and by objective. Pagination: 20 rows per page using the existing `Pagination` shadcn component.
- **D-22:** The strategic dashboard page is the default landing after `/dashboard` for users with `admin`, `ceo`, or `risk-officer` active roles. Other roles see a "no data yet" state on this section of the dashboard.

### RBAC Summary

- **D-23:** Role-to-action matrix for this phase:
  | Action | admin | ceo | risk-officer | audit-officer | board-member | dept-head |
  |--------|-------|-----|--------------|---------------|--------------|-----------|
  | Create objective | Yes | Yes | No | No | No | No |
  | Edit/cancel objective | Yes | Yes | No | No | No | No |
  | View objectives | Yes | Yes | Yes | Yes | Yes | Yes |
  | Create KPI | Yes | Yes | Yes | No | No | No |
  | Edit KPI | Yes | Yes | Yes | No | No | No |
  | Record reading | Owner+admin | Owner+admin | Owner+admin | No | No | No |
  | View KPI grid | Yes | Yes | Yes | Yes | Yes | Yes |

### Row-Level Security

- **D-24:** All three new tables (`strategic_objectives`, `kpis`, `kpi_readings`) have RLS enabled with `institution_id = (select institution_id from user_profiles where id = auth.uid())` isolation — identical pattern to Phase 1 tables.
- **D-25:** Audit triggers attached via `audit.attach_audit_trigger()` on all three tables — same migration pattern as Phase 1.

### Routing & Navigation

- **D-26:** Route structure under `app/(protected)/strategic/`:
  - `/strategic` — KPI summary grid dashboard (STRAT-06)
  - `/strategic/objectives` — List of all objectives (TanStack Table)
  - `/strategic/objectives/new` — Create objective form
  - `/strategic/objectives/[id]` — Objective detail + linked KPIs list
  - `/strategic/objectives/[id]/edit` — Edit objective
  - `/strategic/kpis/new` — Create KPI (with objective selector)
  - `/strategic/kpis/[id]` — KPI detail + readings history
  - `/strategic/kpis/[id]/readings/new` — Record a period reading
- **D-27:** Navigation item "Strategic" added to the protected sidebar (visible to all roles).

### Server Actions & Validation

- **D-28:** Server Actions live in `lib/strategic/actions.ts` with `'use server'` directive — same pattern as `lib/auth/actions.ts`.
- **D-29:** Zod v3.x schemas for all forms live in `lib/schemas/strategic.ts`.
- **D-30:** All numeric inputs (baseline, target, actual) validated as `z.coerce.number()` to handle form string-to-number coercion. Reporting period label validated with regex pattern matching the ISO-period format for the selected frequency.

### Claude's Discretion

- Exact form layout details (field order, helper text copy, placeholder text)
- Pagination behavior (cursor vs offset — use offset since TanStack Table already uses it)
- Loading skeleton design for the KPI grid
- Empty state illustration/icon choice for "No KPIs yet"
- Exact Recharts sparkline styling (stroke width, dot size, color)
- Migration timestamp selection

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements

- `.planning/REQUIREMENTS.md` — STRAT-01 through STRAT-06 acceptance criteria; also see v2 deferred items (NDS2 hierarchy, cross-institution comparison) to confirm what stays out of scope
- `.planning/PROJECT.md` — Project constraints (Next.js 14 App Router, Supabase, Zod v3.x, 4-6 week timeline), NDS2 alignment rationale, governance waterfall model

### Phase 1 Foundation (patterns to follow)

- `.planning/phases/01-foundation-authentication-rls-and-audit-trail/01-CONTEXT.md` — Locked decisions for auth patterns, RLS design, audit trail, shadcn/ui + Tailwind tokens, Zod v3 constraint
- `.planning/phases/01-foundation-authentication-rls-and-audit-trail/01-SUMMARY.md` — Complete file list from Phase 1, migration naming convention, key patterns (getUser(), SECURITY DEFINER, three-layer audit immutability, JWT claims usage)

### Existing Code

- `lib/supabase/server.ts` — Server-side Supabase client (use `createClient()` from here in Server Actions and Server Components)
- `lib/supabase/client.ts` — Browser Supabase client (use only in Client Components)
- `lib/auth/actions.ts` — Reference implementation for Server Action pattern: `'use server'`, Zod parse, Supabase call, role check via JWT claims
- `lib/schemas/auth.ts` — Reference for Zod v3 schema style
- `supabase/migrations/20260522000001_base_schema.sql` — Existing enums, table patterns, index naming conventions
- `supabase/migrations/20260522000002_rls_policies.sql` — RLS policy pattern to replicate for new tables
- `supabase/migrations/20260522000003_audit_triggers.sql` — `audit.attach_audit_trigger()` usage
- `tailwind.config.ts` — Color tokens: navy-950, navy-900, navy-mid, paper, paper-border, gold, gold-hi, gold-pale, ok, warn, err

### Reference Document

- `C:\Users\Kuziwa\Desktop\Lab\whitepaper.md` — GRC-Nexus Version 2.1 Core Guideline; Section on Strategic Planning covers NDS2 alignment, KPI framework, and the governance waterfall model that informs objective structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `components/ui/badge.tsx` — Status badge component; use for On Track / At Risk / Off Track / No Data with `ok`/`warn`/`err`/`paper-border` color tokens
- `components/ui/card.tsx` — Card with shadow-card style; use for objective and KPI detail pages
- `components/ui/table.tsx` — shadcn Table; TanStack Table renders into this (same as AuditLogTable)
- `components/ui/pagination.tsx` — Already used in audit log; reuse for KPI grid and objectives list
- `components/ui/select.tsx` — Use for NDS2 pillar selector, reporting frequency selector, status filter
- `components/ui/form.tsx` + `components/ui/input.tsx` + `components/ui/label.tsx` — Full form stack with react-hook-form + Zod, same as Phase 1 forms
- `components/ui/dialog.tsx` — Use for confirmation dialogs (e.g., cancel objective, delete KPI)
- `app/(protected)/admin/audit-log/AuditLogTable.tsx` — Reference implementation for TanStack Table + shadcn table + pagination pattern
- `lib/files/checksum.ts` — Not directly reused; evidence that utility files live in `lib/`

### Established Patterns

- **Server Components by default** — pages are async Server Components; only interactive UI (forms, table filters, sparklines) becomes Client Components with `'use client'`
- **Server Actions in `lib/`** — `lib/strategic/actions.ts` with `'use server'`, Zod parse first, then Supabase call, return `{ error: string } | { data: T }`
- **Supabase client selection** — `createClient()` from `lib/supabase/server.ts` in Server Components and Actions; `createBrowserClient()` from `lib/supabase/client.ts` only in Client Components
- **JWT claims for role check** — `user.app_metadata.active_role` (never a DB query) for fast role authorization in Server Actions — see `lib/auth/actions.ts` pattern
- **Zod v3.x** — HARD constraint from CLAUDE.md; no v4 APIs (`z.coerce` is v3-compatible)
- **Migration naming** — `YYYYMMDD######_description.sql` sequential within date; Phase 2 migrations start at `20260522000007_...`
- **Enum addition** — New Postgres enums added in new migration (not editing Phase 1 migrations)
- **RLS policy naming** — `{table}_{role}_policy` or descriptive name; see Phase 1 RLS migration for exact style
- **Index naming** — `idx_{table}_{column}` — all Phase 1 indexes follow this pattern

### Integration Points

- `middleware.ts` — Already protects `/(protected)` routes; no changes needed for Phase 2 routes
- `app/(protected)/layout.tsx` — Sidebar navigation; add "Strategic" nav item pointing to `/strategic`
- `types/supabase.ts` — Add generated types for new tables (or manually extend if Supabase CLI not connected); downstream components rely on typed DB responses
- `supabase/migrations/` — New migrations appended sequentially; Phase 1 migrations must not be modified

</code_context>

<specifics>
## Specific Ideas

- Performance thresholds (90%/70%) are explicitly hardcoded constants, not configurable — keeps Phase 2 scope tight; configurability is a v2 extension if institutions request custom thresholds
- The KPI sparkline shows up to 6 readings (not all history) to keep the grid readable — full reading history is accessible on the KPI detail page
- Reporting period labels use ISO-style shorthand that governance professionals in Zimbabwe's public sector will recognize (Q1/Q2, H1/H2 terminology is standard in NDS2 reporting frameworks)
- The `institutional_goal` field is free-text in Phase 2 (not a lookup table) — avoids premature schema design for something that varies significantly by institution type (ministry vs SOE)
- Status badge uses Tailwind color tokens already defined in `tailwind.config.ts` — no new token additions needed for this phase

</specifics>

<deferred>
## Deferred Ideas

- **NDS2 hierarchical pillar taxonomy** (pillar → outcome → output) — v2 per REQUIREMENTS.md; Phase 2 uses flat pillar enum only
- **Objective approval workflow** — no draft-to-active approval chain in Phase 2; status is set directly by admin/ceo
- **Cross-institution KPI comparison** — v2; prototype is single-institution
- **KPI performance threshold configuration per institution** — v2; Phase 2 thresholds are global constants
- **Automated KPI reading reminders** — notifications when a reading period is due; deferred to Phase 8 (notifications module)
- **KPI targets that vary over time** (milestone targets per period) — v2 extension; Phase 2 uses a single static target value
- **Institutional 5-year goal lookup table** — Phase 2 uses free-text; structured goal taxonomy is a v2 feature
- **Bulk import of objectives/KPIs via CSV** — deferred; not in STRAT requirements
- **PDF export of KPI summary report** — Phase 8 (RPT-03)

</deferred>

---

*Phase: 02-strategic-planning-objectives-and-kpis*
*Context gathered: 2026-05-22*
