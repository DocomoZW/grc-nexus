# Phase 2: Strategic Planning — Objectives and KPIs - Research

**Researched:** 2026-05-22
**Domain:** Recharts v3, TanStack Table v8, Supabase embedded joins, Zod v3 Server Actions, NDS2 taxonomy
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 8 NDS2 2026–2030 pillars as Postgres enum `nds2_pillar`: `economic_transformation`, `social_development`, `infrastructure_development`, `environmental_sustainability`, `governance_and_institutions`, `innovation_and_technology`, `regional_and_international_integration`, `rural_and_urban_development`
- **D-02:** Objectives tagged to NDS2 pillar OR institutional 5-year goal (free-text); at least one required
- **D-03:** NDS2 hierarchy (pillar → outcome → output) deferred to v2
- **D-04:** `strategic_objectives` table columns as specified
- **D-05:** Objective status enum: `draft`, `active`, `at_risk`, `completed`, `cancelled`
- **D-06:** Flat objective hierarchy — no parent-child nesting in Phase 2
- **D-07:** Create objectives: `admin` and `ceo` only
- **D-08:** `kpis` table columns as specified
- **D-09:** Reporting frequency enum: `monthly`, `quarterly`, `semi_annual`, `annual`
- **D-10:** Create KPIs: `admin`, `ceo`, `risk-officer`
- **D-11:** `kpi_readings` table columns as specified
- **D-12:** Period label format — ISO-period style: `YYYY-M##`, `YYYY-Q#`, `YYYY-H#`, `YYYY`
- **D-13:** Record readings: KPI `owner_id` (any role) plus `admin`
- **D-14:** Performance thresholds: On Track ≥90%, At Risk 70–89%, Off Track <70% of target
- **D-15:** No readings → `No Data` badge (neutral)
- **D-16:** Thresholds hardcoded in `lib/strategic/kpi-utils.ts` — not configurable per institution
- **D-17 to D-22:** KPI dashboard at `app/(protected)/strategic/page.tsx`; TanStack Table grid; Recharts sparkline (last 6 readings); 20 rows/page; `ok`/`warn`/`err`/`paper-border` badge colors
- **D-23:** RBAC role matrix as specified in CONTEXT.md
- **D-24:** RLS on all three tables with `institution_id = (select auth.institution_id())` isolation
- **D-25:** Audit triggers via `audit.attach_audit_trigger()` on all three tables
- **D-26:** Route structure under `app/(protected)/strategic/`
- **D-27:** "Strategic" nav item added to protected sidebar
- **D-28:** Server Actions in `lib/strategic/actions.ts` with `'use server'`
- **D-29:** Zod v3.x schemas in `lib/schemas/strategic.ts`
- **D-30:** Numeric inputs via `z.coerce.number()`; period labels validated with regex per frequency

### Claude's Discretion

- Exact form layout (field order, placeholder text, helper text copy)
- Pagination behavior (offset — use offset since TanStack Table already uses it)
- Loading skeleton design for KPI grid
- Empty state illustration/icon choice for "No KPIs yet"
- Exact Recharts sparkline styling (stroke width, dot size, color)
- Migration timestamp selection

### Deferred Ideas (OUT OF SCOPE)

- NDS2 hierarchical pillar taxonomy (pillar → outcome → output)
- Objective approval workflow
- Cross-institution KPI comparison
- KPI performance threshold configuration per institution
- Automated KPI reading reminders
- KPI targets that vary over time (milestone targets per period)
- Institutional 5-year goal lookup table
- Bulk import of objectives/KPIs via CSV
- PDF export of KPI summary report (Phase 8)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRAT-01 | Admin/CEO creates strategic objectives tagged to NDS2 pillars | D-01 enum locked; `objectiveSchema` with `z.enum([...8 pillars])` optional + `institutional_goal` free-text; `.refine()` enforces at-least-one |
| STRAT-02 | Objectives have owner, start/target date, status | `strategic_objectives` table columns D-04; `objective_status` enum D-05; `updateObjective` server action pattern |
| STRAT-03 | KPIs linked to objectives with baseline, target, unit, frequency | `kpis` table D-08; `kpiSchema` with `z.coerce.number()` for numerics D-30; `kpi_frequency` enum D-09 |
| STRAT-04 | KPI owners record period readings | `kpi_readings` table D-11; `recordKpiReading` action; owner-or-admin check D-13; period regex validation D-12 |
| STRAT-05 | Performance status On Track / At Risk / Off Track | `calculateKpiStatus()` pure function in `kpi-utils.ts`; thresholds D-14; edge cases covered in research Q4 |
| STRAT-06 | Dashboard KPI grid with status colors and trend sparklines | `KpiGrid.tsx` + `KpiSparkline.tsx`; Recharts `LineChart` no-axes pattern (Q1); TanStack Table v8 (Q2); Supabase join for latest reading (Q3) |
</phase_requirements>

---

## Summary

Phase 2 builds on the Phase 1 foundation without introducing any new architectural patterns at the framework level. All six research questions resolve to concrete, implementable answers. The most significant version clarification is that **TanStack Table v9 is alpha-only** (v8.21.3 is `latest` on npm); the plan must use v8. Recharts v3.8.1 is stable and the correct choice. Neither library is yet installed in the project — both require `npm install`.

The Recharts sparkline pattern is minimal and verified: `ResponsiveContainer + LineChart + Line` with `isAnimationActive={false}` and `dot={false}` produces a clean micro-chart. No axis or tooltip components are rendered — omitting them removes them entirely (Recharts renders nothing for omitted child components).

The Supabase "latest reading per KPI" problem has a clean solution using embedded joins. Supabase JS fetches all readings via the foreign key relationship; the "latest" reading is selected in JavaScript using `.sort()` + `[0]` on the returned array, sorted by `recorded_at` descending. This avoids raw SQL and works within the typed Supabase client. For larger datasets (100+ readings per KPI), a Postgres view using `DISTINCT ON` is the optimal path — documented below as an optional optimization.

The performance status function requires careful edge-case handling: division by zero when `target_value = 0`, "overperformed" when `actual > target` (treated as On Track), and `null`/`undefined` actual (No Data). All cases are covered in the verified implementation below.

**Primary recommendation:** Install `recharts@^3.8.1` and `@tanstack/react-table@^8.21.3`. Use v8 TanStack Table (not v9 alpha). Follow the patterns in PATTERNS.md exactly — all code patterns in this research are aligned with the existing Phase 1 codebase.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Objective/KPI CRUD | API (Server Actions) | DB (RLS) | Business logic + role enforcement in Server Actions; RLS as second enforcement layer |
| Performance status calculation | API (Server Actions / Server Components) | Client Component | Pure function in `kpi-utils.ts` — importable from both tiers |
| KPI grid display + filtering | Browser (Client Component) | Frontend Server (SSR fetch) | Interactive filtering/sorting is client-side; data fetched server-side in page.tsx |
| Trend sparkline rendering | Browser (Client Component) | — | Recharts requires DOM; must be `'use client'` |
| NDS2 pillar enum storage | Database | API | Postgres enum enforces valid values at DB layer |
| Audit trail | Database (Triggers) | — | Enforced at SECURITY DEFINER trigger layer — survives app bugs |
| RLS data isolation | Database | — | `auth.institution_id()` helper from Phase 1; no app-layer filtering needed |

---

## Standard Stack

### Packages to Install (Not Yet in package.json)

```bash
npm install recharts@^3.8.1 @tanstack/react-table@^8.21.3
```

[VERIFIED: npm registry — checked 2026-05-22]

### Verified Installed Packages (package.json)

| Package | Installed Version | Purpose |
|---------|-----------------|---------|
| `zod` | `^3.25.76` | Schema validation — v3.x constraint enforced |
| `react-hook-form` | `^7.76.0` | Form management |
| `@hookform/resolvers` | `^3.10.0` | Zod ↔ react-hook-form bridge |
| `@supabase/ssr` | `^0.10.3` | Server-side Supabase client |
| `sonner` | `^2.0.7` | Toast notifications |

### Version Clarifications

| CONTEXT.md Said | Actual npm `latest` | Action |
|----------------|--------------------|----|
| TanStack Table v9 | v8.21.3 (`latest`); v9 is `9.0.0-alpha.49` (`alpha` tag) | **Use v8.21.3** — v9 is not production-ready |
| Recharts v3 | v3.8.1 (`latest`) | Install v3.8.1 — correct and stable |
| Zod v3.24.x | v3.25.76 installed | Already installed; `^3.25.76` satisfies requirement |

[VERIFIED: npm registry — `npm view recharts dist-tags`, `npm view @tanstack/react-table dist-tags`]

---

## Research Questions — Concrete Answers

### Q1: Recharts v3 LineChart Sparkline (STRAT-06)

**Verified pattern for an 80×32px sparkline in a table cell.**

[VERIFIED: Context7 /recharts/recharts — recharts/recharts README.md + storybook examples]

The sparkline is a Client Component because Recharts requires the DOM for SVG rendering.

**Key properties for table-cell use:**
- `isAnimationActive={false}` — mandatory; prevents layout jank during table re-renders
- `dot={false}` — removes data point dots (too dense at 80×32px)
- No `<XAxis>`, `<YAxis>`, `<CartesianGrid>`, `<Tooltip>`, `<Legend>` — simply omit them; Recharts renders nothing for absent children
- `margin={{ top: 2, right: 2, bottom: 2, left: 2 }}` — prevents SVG clipping at edges
- `ResponsiveContainer width="100%" height="100%"` — fills the containing `div`; never set `width`/`height` directly on `LineChart`

```tsx
// Source: Context7 /recharts/recharts (recharts README + storybook examples)
// File: app/(protected)/strategic/KpiSparkline.tsx
'use client'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  readings: { actual_value: number; reporting_period: string }[]
  status: 'on_track' | 'at_risk' | 'off_track' | 'no_data'
}

// Hex values match tailwind.config.ts tokens exactly
const SPARKLINE_COLOR: Record<SparklineProps['status'], string> = {
  on_track:  '#27AE60',  // --color-ok
  at_risk:   '#E67E22',  // --color-warn
  off_track: '#E74C3C',  // --color-err
  no_data:   '#D7E2EF',  // --color-paper-border
}

export function KpiSparkline({ readings, status }: SparklineProps) {
  // Last 6 readings, sorted oldest-first for left-to-right trend (D-20)
  const data = [...readings]
    .sort((a, b) => a.reporting_period.localeCompare(b.reporting_period))
    .slice(-6)
    .map((r) => ({ value: r.actual_value }))

  if (data.length === 0) {
    // Gray placeholder rectangle — same dimensions
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

**Why no axes are needed:** Recharts only renders child components explicitly listed in JSX. Omitting `<XAxis>` and `<YAxis>` removes them completely — no extra config required.

**Import:** `import { LineChart, Line, ResponsiveContainer } from 'recharts'`

---

### Q2: TanStack Table v8 — useReactTable Setup (STRAT-06)

**Use v8.21.3 (latest stable). v9 is alpha-only and not suitable for production.**

[VERIFIED: npm registry — `npm view @tanstack/react-table dist-tags` → `{ beta: '8.0.0-beta.9', latest: '8.21.3', alpha: '9.0.0-alpha.49' }`]

[VERIFIED: Context7 /websites/tanstack_table — sorting, filtering examples from tanstack.com/table/latest/docs]

**What changed from v8 to v9 (informational only — use v8):**
- v9 introduces `tableFeatures({})` and `createColumnHelper<typeof _features, T>()` — a new generic system
- v9 imports row models from `@tanstack/react-table/legacy` for backward compatibility
- v9 API is unstable (alpha.49) — not appropriate for this project's 4-6 week timeline

**v8 useReactTable pattern for the objectives/KPI tables:**

```tsx
// Source: Context7 /websites/tanstack_table (tanstack.com/table/latest/docs/framework/react/examples/sorting)
// File: app/(protected)/strategic/ObjectivesTable.tsx (or KpiGrid.tsx)
'use client'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

type ObjectiveRow = {
  id: string
  title: string
  status: string
  nds2_pillar: string | null
  institutional_goal: string | null
  owner_id: string | null
  target_date: string | null
  created_at: string
}

interface ObjectivesTableProps {
  objectives: ObjectiveRow[]
  activeRole: string | undefined
}

export function ObjectivesTable({ objectives, activeRole }: ObjectivesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<ObjectiveRow>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Objective Title',
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => info.getValue<string>(),  // wrap in <Badge> in real impl
      },
      {
        accessorKey: 'nds2_pillar',
        header: 'NDS2 Pillar',
        cell: (info) => info.getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'target_date',
        header: 'Target Date',
        cell: (info) => info.getValue<string | null>() ?? '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          // Edit / Cancel buttons, role-gated
          <span>{row.original.id}</span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: objectives,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="bg-white rounded-[10px] border border-paper-border shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-paper">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : null}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-paper/50 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="text-[13px] text-navy-900 px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Key v8 facts:**
- `ColumnDef<T>` generic takes the row type directly (no `_features` in v8)
- `useMemo` wrapping `columns` array is required — prevents column redefinition on every render
- `flexRender` handles both React elements and primitive values in cell/header renderers
- `table.getRowModel().rows` returns the final row set after sorting + filtering
- Client-side pagination uses `getPaginationRowModel()` if desired; for Phase 2 the server fetches pages and TanStack Table handles just sorting/filtering of the current page

---

### Q3: Supabase "Latest Reading per KPI" Query (STRAT-05, STRAT-06)

**Two approaches — both correct. Recommendation: Approach A for Phase 2 (simpler); Approach B as an optimization if readings volumes grow.**

[VERIFIED: Context7 /supabase/supabase — joins-and-nesting.mdx embedded join pattern]

#### Approach A: Embedded join — all readings, select latest in JS (Recommended for Phase 2)

```typescript
// Source: Context7 /supabase/supabase (joins-and-nesting.mdx)
// In app/(protected)/strategic/page.tsx (Server Component)
const { data: kpis, count } = await supabase
  .from('kpis')
  .select(
    `
    id,
    title,
    owner_id,
    baseline_value,
    target_value,
    unit_of_measure,
    reporting_frequency,
    objective_id,
    strategic_objectives ( id, title ),
    kpi_readings ( actual_value, reporting_period, recorded_at )
    `,
    { count: 'exact' }
  )
  .order('created_at', { ascending: false })
  .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
```

Then in the component, select the latest reading:

```typescript
// Helper to extract latest reading from the readings array returned by Supabase
function getLatestReading(
  readings: { actual_value: number; reporting_period: string; recorded_at: string }[]
): { actual_value: number; reporting_period: string } | null {
  if (!readings || readings.length === 0) return null
  return [...readings].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )[0]
}
```

**Tradeoff:** Fetches all readings per KPI. For Phase 2 (prototype, few readings per KPI), this is perfectly acceptable. Readings are also used for the sparkline (last 6), so fetching all serves double duty.

#### Approach B: Postgres view with DISTINCT ON (Optimization — add if needed)

If readings volume grows and the query becomes slow, add this view in a migration:

```sql
-- Optional optimization view — add in a later migration if needed
-- Migration: 20260522000010_strategic_latest_readings_view.sql
create or replace view public.kpi_latest_readings as
select distinct on (kpi_id)
  kpi_id,
  actual_value,
  reporting_period,
  recorded_at
from public.kpi_readings
order by kpi_id, recorded_at desc;
```

Then query:

```typescript
// Approach B — requires the view above
const { data: latestReadings } = await supabase
  .from('kpi_latest_readings')
  .select('kpi_id, actual_value, reporting_period, recorded_at')
  .in('kpi_id', kpiIds)
```

**Recommendation for Phase 2:** Use Approach A. Add Approach B view only if performance testing shows it is needed. Do NOT add the view in Phase 2 unless planned.

#### Why not `.limit(1)` on embedded join?

Supabase PostgREST does not support `.limit()` on an embedded (related) resource in a single query. The limit applies to the outer table. Fetching all readings and sorting in JS is the correct PostgREST approach.

---

### Q4: Performance Status Pure Function (STRAT-05)

**All edge cases handled.**

[VERIFIED: CONTEXT.md D-14, D-15, D-16 — logic is fully locked]

```typescript
// Source: CONTEXT.md locked decisions D-14/D-15/D-16
// File: lib/strategic/kpi-utils.ts

export const KPI_ON_TRACK_THRESHOLD = 0.90  // actual >= 90% of target
export const KPI_AT_RISK_THRESHOLD  = 0.70  // actual >= 70% and < 90% of target

export type KpiStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data'

/**
 * Calculate KPI performance status.
 *
 * Edge cases:
 *  - actual null/undefined → 'no_data' (D-15: no readings yet)
 *  - target_value = 0 → guard: return 'no_data' (avoid division by zero;
 *    a zero-target KPI has no meaningful % calculation)
 *  - actual > target (overperformed) → ratio > 1.0 → falls into 'on_track'
 *    (≥0.90 threshold; no special "overperformed" status in Phase 2 per D-14)
 *  - target = baseline (no improvement expected) → same ratio logic applies;
 *    actual matching baseline = ratio of 1.0 = 'on_track'
 *  - negative targets (decline KPIs, e.g. "reduce error rate from 20% to 5%"):
 *    Phase 2 does NOT handle inverted KPIs; thresholds assume higher=better.
 *    [ASSUMED] — CONTEXT.md does not address inverted KPIs; treat as out of scope.
 */
export function calculateKpiStatus(
  actualValue: number | null | undefined,
  targetValue: number,
): KpiStatus {
  // No data cases
  if (actualValue === null || actualValue === undefined) return 'no_data'

  // Guard: target of zero has no meaningful ratio
  if (targetValue === 0) return 'no_data'

  const ratio = actualValue / targetValue

  if (ratio >= KPI_ON_TRACK_THRESHOLD) return 'on_track'   // ≥90% (includes overperformed)
  if (ratio >= KPI_AT_RISK_THRESHOLD)  return 'at_risk'    // 70–89%
  return 'off_track'                                         // <70%
}

// Badge display config — matches Tailwind tokens in tailwind.config.ts
export const KPI_STATUS_BADGE: Record<KpiStatus, { label: string; className: string }> = {
  on_track:  { label: 'On Track',  className: 'bg-ok/10 text-ok border-ok/30' },
  at_risk:   { label: 'At Risk',   className: 'bg-warn/10 text-warn border-warn/30' },
  off_track: { label: 'Off Track', className: 'bg-err/10 text-err border-err/30' },
  no_data:   { label: 'No Data',   className: 'bg-paper text-navy-mid border-paper-border' },
}
```

**Usage in KpiGrid:**

```typescript
// For each KPI row in the table:
const latestReading = getLatestReading(kpi.kpi_readings ?? [])
const status = calculateKpiStatus(latestReading?.actual_value ?? null, kpi.target_value)
const badge = KPI_STATUS_BADGE[status]
```

**Unit-testable:** This pure function is the primary test target for Phase 2. See Validation Architecture section.

---

### Q5: Server Action + Zod v3 CRUD Pattern (STRAT-01 through STRAT-04)

**The exact pattern is established in Phase 1 and documented in PATTERNS.md. This section provides the complete signatures and the react-hook-form `setError` compatibility shape.**

[VERIFIED: lib/auth/actions.ts in codebase — read directly]
[VERIFIED: Context7 — Zod v3 `safeParse()` pattern]

#### Action Signatures

```typescript
// File: lib/strategic/actions.ts
'use server'

// Return type used by ALL actions in this file:
type ActionResult<T = void> =
  | { error: string; data?: never }
  | { data: T; error?: never }

export async function createObjective(
  values: ObjectiveInput
): Promise<ActionResult<{ id: string }>>

export async function updateObjective(
  id: string,
  values: ObjectiveInput
): Promise<ActionResult<{ id: string }>>

export async function updateObjectiveStatus(
  id: string,
  status: string
): Promise<ActionResult<{ id: string }>>

export async function createKpi(
  values: KpiInput
): Promise<ActionResult<{ id: string }>>

export async function updateKpi(
  id: string,
  values: KpiInput
): Promise<ActionResult<{ id: string }>>

export async function recordKpiReading(
  kpiId: string,
  values: KpiReadingInput
): Promise<ActionResult<{ id: string }>>
```

#### Zod v3 `safeParse` first, then role check

```typescript
// Source: lib/auth/actions.ts (verified in codebase)
export async function createObjective(values: ObjectiveInput) {
  // Step 1: Zod parse — server is the trust boundary
  const parsed = objectiveSchema.safeParse(values)
  if (!parsed.success) {
    // Return first error message — react-hook-form displays as form-level error
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // Step 2: Authenticate
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  // Step 3: Role check via JWT claim — NO DB query
  const appMeta = user.app_metadata as Record<string, string>
  if (!['admin', 'ceo'].includes(appMeta?.active_role)) {
    return { error: 'You do not have permission to create objectives.' }
  }

  const institutionId = appMeta?.institution_id

  // Step 4: Insert
  try {
    const { data, error } = await supabase
      .from('strategic_objectives')
      .insert({
        ...parsed.data,
        institution_id: institutionId,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) throw error

    revalidatePath('/strategic/objectives')
    revalidatePath('/strategic')
    return { data: { id: data.id } }
  } catch (err) {
    console.error('[createObjective]', err)
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
  // redirect() goes here, outside try/catch — it throws NextRedirect internally
}
```

#### React-hook-form `setError` compatibility

The return shape `{ error: string }` is compatible with a form-level error display pattern — the Client Component sets state, not `form.setError()`. This is the established Phase 1 pattern:

```typescript
// In the form component's onSubmit:
function onSubmit(values: ObjectiveInput) {
  setError(null)           // clear previous error
  startTransition(async () => {
    const result = await createObjective(values)
    if (result?.error) {
      setError(result.error)  // display in <Alert> above the form
    } else {
      router.push('/strategic/objectives')
    }
  })
}
```

**Why not `form.setError(field, { message })`?** Server Actions in this project return a single string error (not per-field errors) because Zod field-level errors are caught client-side by `zodResolver` before the action is ever called. The server only needs to return top-level rejection reasons (role denied, DB error, etc.). This matches the Phase 1 pattern in `RegisterForm.tsx` and `LoginForm.tsx`.

If field-specific server errors are needed (e.g., unique constraint violation on `reporting_period`), use:

```typescript
// Optional: set a specific field error from server response
if (result?.error?.includes('reporting_period')) {
  form.setError('reporting_period', { message: result.error })
} else {
  setError(result.error)
}
```

#### Zod v3 Schema Notes

```typescript
// File: lib/schemas/strategic.ts
// CONSTRAINT: Zod v3.x only — project has ^3.25.76 installed

// z.coerce.number() is v3-compatible (D-30)
// z.coerce.number({ invalid_type_error: '...' }) — pass options object for custom message

// Cross-field validation with .refine() (D-02: NDS2 pillar OR institutional goal required)
export const objectiveSchema = z.object({
  // ...fields...
  nds2_pillar:        z.enum([...8 pillars]).optional().nullable(),
  institutional_goal: z.string().optional(),
}).refine(
  (data) => !!data.nds2_pillar || (!!data.institutional_goal && data.institutional_goal.trim().length > 0),
  {
    message: 'At least one of NDS2 Pillar or Institutional Goal is required.',
    path: ['nds2_pillar'],  // points FormMessage to this field
  }
)
```

---

### Q6: NDS2 Pillar Enum — Exact 8 Pillar Names (STRAT-01)

**Locked in CONTEXT.md D-01. These are the definitive values.**

[VERIFIED: CONTEXT.md D-01 — locked decision from discussion phase]
[ASSUMED: Alignment with Zimbabwe NDS2 2026–2030 official document — exact pillar names were agreed by user in discussion phase; not independently verified against the official NDS2 2026-2030 publication in this research session]

#### Postgres Enum Values (snake_case) → Display Labels

| Enum Value | Display Label |
|-----------|--------------|
| `economic_transformation` | Economic Transformation |
| `social_development` | Social Development |
| `infrastructure_development` | Infrastructure Development |
| `environmental_sustainability` | Environmental Sustainability |
| `governance_and_institutions` | Governance & Institutions |
| `innovation_and_technology` | Innovation & Technology |
| `regional_and_international_integration` | Regional & International Integration |
| `rural_and_urban_development` | Rural & Urban Development |

#### SQL Declaration

```sql
-- In migration 20260522000007_strategic_schema.sql
create type public.nds2_pillar as enum (
  'economic_transformation',
  'social_development',
  'infrastructure_development',
  'environmental_sustainability',
  'governance_and_institutions',
  'innovation_and_technology',
  'regional_and_international_integration',
  'rural_and_urban_development'
);
```

#### TypeScript Type + Label Map

```typescript
// File: types/strategic.ts
export type Nds2Pillar =
  | 'economic_transformation'
  | 'social_development'
  | 'infrastructure_development'
  | 'environmental_sustainability'
  | 'governance_and_institutions'
  | 'innovation_and_technology'
  | 'regional_and_international_integration'
  | 'rural_and_urban_development'

export const NDS2_PILLAR_LABELS: Record<Nds2Pillar, string> = {
  economic_transformation:             'Economic Transformation',
  social_development:                  'Social Development',
  infrastructure_development:          'Infrastructure Development',
  environmental_sustainability:        'Environmental Sustainability',
  governance_and_institutions:         'Governance & Institutions',
  innovation_and_technology:           'Innovation & Technology',
  regional_and_international_integration: 'Regional & International Integration',
  rural_and_urban_development:         'Rural & Urban Development',
}
```

#### Zod Enum (exact values for schema)

```typescript
// In lib/schemas/strategic.ts
const NDS2_PILLARS = [
  'economic_transformation',
  'social_development',
  'infrastructure_development',
  'environmental_sustainability',
  'governance_and_institutions',
  'innovation_and_technology',
  'regional_and_international_integration',
  'rural_and_urban_development',
] as const

// Use in objectiveSchema:
nds2_pillar: z.enum(NDS2_PILLARS).optional().nullable(),
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sparkline chart | Custom SVG path | Recharts `<LineChart>` | SVG viewBox math, scaling, edge cases with 1-point datasets |
| Table sort/filter | Manual array operations per column | TanStack Table `getSortedRowModel()` / `getFilteredRowModel()` | Multi-column sort interaction, filter composition, type safety |
| Form validation | Manual field checks | Zod v3 + `zodResolver` | Cross-field rules, coercion, TypeScript type inference |
| Numeric coercion | `parseInt(value, 10)` | `z.coerce.number()` | Handles `""`, `"abc"`, `null` edge cases automatically |
| Latest-record query | Custom recursive SQL | Approach A (JS sort) or DISTINCT ON view | PostgREST doesn't support per-relationship limits |
| Audit trail | Manual INSERT in every action | `audit.attach_audit_trigger()` from Phase 1 | Already exists; survives app bugs at DB layer |

---

## Common Pitfalls

### Pitfall 1: Installing TanStack Table v9

**What goes wrong:** `npm install @tanstack/react-table` installs v8. `npm install @tanstack/react-table@next` or `@tanstack/react-table@alpha` installs v9 alpha. v9 changes `ColumnDef<T>` to `ColumnDef<typeof _features, T>` and requires `tableFeatures({})`. Mixing v8 patterns with v9 gives TypeScript errors on every column definition.

**How to avoid:** Pin explicitly: `npm install @tanstack/react-table@^8.21.3`. Confirm with `npm list @tanstack/react-table`.

**Warning signs:** TypeScript error on `ColumnDef<Person>[]` saying it expects 2 type arguments.

---

### Pitfall 2: Recharts Animation in Table Cells

**What goes wrong:** Recharts animates by default (`isAnimationActive` defaults to `true`). In a table with 20 rows, 20 simultaneous SVG animations cause visible layout jank and React re-render cascades.

**How to avoid:** Always set `isAnimationActive={false}` on `<Line>` for sparklines in table cells.

**Warning signs:** Table flickers or columns shift width briefly when the KPI grid first renders.

---

### Pitfall 3: Supabase Embedded Join Returns Array (Not Single Object)

**What goes wrong:** `kpi_readings` in the embedded join returns an array (even if filtered). Code like `kpi.kpi_readings.actual_value` throws `TypeError: Cannot read properties of undefined`.

**How to avoid:** Always treat embedded join results as arrays. Use `getLatestReading(kpi.kpi_readings ?? [])` which handles the empty-array case.

**Warning signs:** Runtime `TypeError` when a KPI has no readings.

---

### Pitfall 4: Division by Zero in Performance Status

**What goes wrong:** `calculateKpiStatus(50, 0)` returns `Infinity` from `50 / 0`, which then evaluates as `>= 0.90` (truthy) → `'on_track'`. This silently misclassifies KPIs with zero targets.

**How to avoid:** The guard `if (targetValue === 0) return 'no_data'` must be the second check (after null actual). See Q4 implementation.

**Warning signs:** KPIs with a target of 0 showing "On Track" without any readings recorded.

---

### Pitfall 5: z.coerce.number() with Empty String

**What goes wrong:** HTML `<input type="number">` returns `""` when empty. `z.coerce.number()` converts `""` to `NaN` and then fails validation with `invalid_type_error`. Without a proper message, users see an unhelpful generic error.

**How to avoid:** Always provide `invalid_type_error`:

```typescript
z.coerce.number({ invalid_type_error: 'Target value must be a number.' })
```

Add a `.min(0)` if negative values are invalid for the field.

---

### Pitfall 6: Zod `.refine()` Path Not Matching FormField name

**What goes wrong:** `objectiveSchema.refine(..., { path: ['pillar'] })` but the form field is named `nds2_pillar`. The `<FormMessage>` for `nds2_pillar` won't receive the error; it floats unattached.

**How to avoid:** The `path` in `.refine()` must exactly match the `name` prop of the `<FormField>` in react-hook-form. For the NDS2/institutional_goal cross-field rule, use `path: ['nds2_pillar']`.

---

### Pitfall 7: Recharts ResponsiveContainer Needs a Sized Parent

**What goes wrong:** `<ResponsiveContainer width="100%" height="100%">` inside a `<td>` with no explicit height renders with `height: 0` because table cells don't auto-size to their content in some CSS contexts.

**How to avoid:** Wrap in a fixed-size `<div className="w-[80px] h-[32px]">` before the `ResponsiveContainer`. Never put `ResponsiveContainer` directly in a `<td>`.

---

## Architecture Patterns

### Data Flow for KPI Dashboard (STRAT-06)

```
Browser Request
    │
    ▼
app/(protected)/strategic/page.tsx  [Server Component, force-dynamic]
    │   Parse URL searchParams (status filter, objective filter, page)
    │   getUser() → role check → redirect if unauth
    │   supabase.from('kpis').select('*, strategic_objectives(*), kpi_readings(*)')
    │   .range(offset, offset+19)
    │
    ▼
KpiGrid.tsx [Client Component]
    │   useReactTable(data, columns, getCoreRowModel, getSortedRowModel, getFilteredRowModel)
    │   Per row: getLatestReading() → calculateKpiStatus() → KPI_STATUS_BADGE
    │
    ├──▶ <Badge> (status color)
    │
    └──▶ KpiSparkline.tsx [Client Component]
             readings.slice(-6)  →  Recharts LineChart (no axes, no tooltip)
```

### Form → Action Flow (STRAT-01, STRAT-03, STRAT-04)

```
ObjectiveForm.tsx [Client Component]
    │   useForm({ resolver: zodResolver(objectiveSchema) })
    │   Client-side validation on blur
    │
    ▼ onSubmit
createObjective(values) [Server Action — 'use server']
    │   safeParse(values) — server-side re-validation
    │   getUser() + role check via app_metadata
    │   supabase.from('strategic_objectives').insert(...)
    │   revalidatePath('/strategic/objectives')
    │   revalidatePath('/strategic')
    │
    ▼
ObjectiveForm.tsx
    setError(result.error) ──▶ <Alert> above form
    OR router.push('/strategic/objectives')
```

### Recommended File Structure (Phase 2 additions only)

```
app/(protected)/strategic/
├── layout.tsx                        # Role gate (all roles allowed to view)
├── page.tsx                          # KPI summary dashboard (Server Component)
├── KpiGrid.tsx                       # TanStack Table v8 (Client Component)
├── KpiFilterBar.tsx                  # URL-based filters (Client Component)
├── KpiSparkline.tsx                  # Recharts sparkline (Client Component)
├── objectives/
│   ├── page.tsx                      # Objectives list (Server Component)
│   ├── ObjectivesTable.tsx           # TanStack Table v8 (Client Component)
│   ├── new/
│   │   ├── page.tsx                  # Shell (Server Component)
│   │   └── ObjectiveForm.tsx         # Form (Client Component)
│   └── [id]/
│       ├── page.tsx                  # Detail + linked KPIs (Server Component)
│       └── edit/
│           ├── page.tsx              # Shell (Server Component)
│           └── ObjectiveEditForm.tsx # Form (Client Component)
└── kpis/
    ├── new/
    │   ├── page.tsx
    │   └── KpiForm.tsx
    └── [id]/
        ├── page.tsx
        └── readings/
            └── new/
                ├── page.tsx
                └── ReadingForm.tsx

lib/
├── strategic/
│   ├── actions.ts                    # 'use server' CRUD actions
│   └── kpi-utils.ts                  # Pure functions: calculateKpiStatus, KPI_STATUS_BADGE
└── schemas/
    └── strategic.ts                  # Zod v3 schemas: objectiveSchema, kpiSchema, kpiReadingSchema

types/
└── strategic.ts                      # TypeScript types: StrategicObjective, Kpi, KpiReading, etc.

supabase/migrations/
├── 20260522000007_strategic_schema.sql   # Enums + tables
├── 20260522000008_strategic_rls.sql      # RLS policies
└── 20260522000009_strategic_triggers.sql # audit.attach_audit_trigger() calls
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (config: `vitest.config.ts`) |
| Environment | jsdom |
| Setup file | `tests/setup.ts` |
| Quick run command | `npm test -- --reporter=verbose tests/strategic/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRAT-05 | `calculateKpiStatus` — all threshold cases | unit | `npm test -- tests/strategic/kpi-utils.test.ts` | ❌ Wave 0 |
| STRAT-05 | Edge: `target=0` → `no_data` | unit | `npm test -- tests/strategic/kpi-utils.test.ts` | ❌ Wave 0 |
| STRAT-05 | Edge: `actual=null` → `no_data` | unit | `npm test -- tests/strategic/kpi-utils.test.ts` | ❌ Wave 0 |
| STRAT-05 | Edge: `actual > target` → `on_track` | unit | `npm test -- tests/strategic/kpi-utils.test.ts` | ❌ Wave 0 |
| STRAT-01/03 | Zod schema validation — `objectiveSchema.safeParse()` | unit | `npm test -- tests/strategic/schemas.test.ts` | ❌ Wave 0 |
| STRAT-01 | `.refine()` — both NDS2 and institutional_goal empty → error | unit | `npm test -- tests/strategic/schemas.test.ts` | ❌ Wave 0 |
| STRAT-04 | `kpiReadingSchema` — period regex per frequency | unit | `npm test -- tests/strategic/schemas.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- tests/strategic/kpi-utils.test.ts tests/strategic/schemas.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/strategic/kpi-utils.test.ts` — covers STRAT-05 pure function (all branches + edge cases)
- [ ] `tests/strategic/schemas.test.ts` — covers STRAT-01/03/04 Zod schemas (valid inputs, invalid inputs, cross-field refine)
- [ ] Install packages first: `npm install recharts@^3.8.1 @tanstack/react-table@^8.21.3`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Handled in Phase 1 |
| V3 Session Management | No | Handled in Phase 1 |
| V4 Access Control | Yes | RLS policies + JWT role check in every Server Action |
| V5 Input Validation | Yes | Zod v3 `safeParse()` before every DB write |
| V6 Cryptography | No | No new crypto in Phase 2 |

### Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Horizontal privilege escalation (reading other institution's KPIs) | Information Disclosure | RLS `institution_id = (select auth.institution_id())` on all 3 tables |
| Role spoofing (dept-head creating objectives) | Elevation of Privilege | JWT claim check `active_role in ('admin', 'ceo')` in Server Action before any insert |
| Mass assignment (extra fields in form POST) | Tampering | Zod `safeParse()` strips unknown fields; only `parsed.data` reaches Supabase |
| KPI reading injection (recording for KPI you don't own) | Tampering | Owner-or-admin check in `recordKpiReading`; RLS `recorded_by = auth.uid()` as second layer |
| Audit bypass | Repudiation | Audit triggers are SECURITY DEFINER at DB layer — Server Action cannot disable them |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Inverted KPIs (lower=better, e.g. error rate reduction) are out of scope for Phase 2 | Q4 Performance Status | If a KPI has `baseline=20%, target=5%`, the formula `actual/target` gives incorrect status (e.g. actual=10% → 10/5=2.0 → on_track when it's actually off_track). Needs product decision before Phase 2 planning if inverted KPIs are required. |
| A2 | The 8 NDS2 pillar names in CONTEXT.md D-01 match the official Zimbabwe NDS2 2026–2030 publication | Q6 NDS2 Pillars | If the official document uses different exact wording, the enum and display labels will need updating. Not verifiable from this research session (requires access to the published document). |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `recharts` | STRAT-06 sparkline | ✗ (not installed) | — | None — must install |
| `@tanstack/react-table` | STRAT-06 grid | ✗ (not installed) | — | None — must install |
| `zod` | All schemas | ✓ | 3.25.76 | — |
| `react-hook-form` | All forms | ✓ | 7.76.0 | — |
| `@hookform/resolvers` | Form+Zod bridge | ✓ | 3.10.0 | — |
| `vitest` | Unit tests | ✓ | 4.1.7 (devDep) | — |
| Supabase project | DB migrations | Assumed ✓ | — | Local Supabase (`supabase start`) |

**Missing dependencies with no fallback:**

- `recharts@^3.8.1` — required for KpiSparkline.tsx. No fallback; install before Wave 1 tasks.
- `@tanstack/react-table@^8.21.3` — required for ObjectivesTable.tsx and KpiGrid.tsx. No fallback; install before Wave 1 tasks.

**Installation command (Wave 0 task):**

```bash
npm install recharts@^3.8.1 @tanstack/react-table@^8.21.3
```

---

## Open Questions

1. **Inverted KPIs (lower-is-better)**
   - What we know: `calculateKpiStatus` uses `actual / target >= 0.90` (higher = better)
   - What's unclear: Does GRC-Nexus need to support KPIs where a lower actual is better (e.g., "reduce procurement exception rate from 15% to 2%")? If so, the ratio formula is inverted.
   - Recommendation: Confirm with user before Phase 2 planning. If inverted KPIs are needed, add a `direction: 'higher_better' | 'lower_better'` field to `kpis` table and branch the calculation. Otherwise, document in UI that all KPIs assume higher-is-better.

2. **Owner display in KPI grid**
   - What we know: `kpis.owner_id` is a UUID referencing `auth.users`
   - What's unclear: The KPI grid (D-18) shows "Owner" column — the query fetches `owner_id` but not the user's display name. A join to `user_profiles` or a separate fetch is needed.
   - Recommendation: Add `user_profiles!owner_id(full_name)` to the embedded Supabase select, or resolve names with a lookup map passed from the Server Component. The plan should specify this.

---

## Sources

### Primary (HIGH confidence)

- **npm registry** — `recharts` v3.8.1 (latest), `@tanstack/react-table` v8.21.3 (latest, v9 alpha only)
- **Context7 /recharts/recharts** — `LineChart`, `ResponsiveContainer`, `Line` component props; `isAnimationActive`, `dot` props verified in README and storybook examples
- **Context7 /websites/tanstack_table** — `useReactTable`, `ColumnDef<T>`, `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel` — v8 API confirmed from tanstack.com/table/latest/docs examples
- **Context7 /supabase/supabase** — embedded join pattern (`from('table').select('*, related_table(cols)')`) verified in joins-and-nesting.mdx
- **lib/auth/actions.ts** (codebase) — Server Action pattern with `safeParse` first, role check, return `{ error } | { data }`, `redirect()` outside try/catch
- **tailwind.config.ts** (codebase) — Token hex values: `ok: #27AE60`, `warn: #E67E22`, `err: #E74C3C`, `paper-border: #D7E2EF`
- **package.json** (codebase) — Installed package versions verified: zod 3.25.76, react-hook-form 7.76.0

### Secondary (MEDIUM confidence)

- **CONTEXT.md D-01 through D-30** — NDS2 pillar names, all table schemas, threshold values, route structure — agreed by user in discussion phase

### Tertiary (LOW confidence / Assumed)

- Inverted KPI support is out of scope — inferred from CONTEXT.md D-14 which defines unidirectional thresholds; not explicitly confirmed
- NDS2 pillar names match official Zimbabwe government publication — assumed from CONTEXT.md D-01

---

## Metadata

**Confidence breakdown:**
- Standard stack (Recharts v3, TanStack Table v8): HIGH — verified via npm registry
- Architecture (data flow, file structure): HIGH — directly follows Phase 1 patterns in codebase
- Performance status function: HIGH — logic locked in CONTEXT.md, edge cases verified by code analysis
- NDS2 pillars: MEDIUM — locked in CONTEXT.md but original source (official NDS2 document) not independently verified
- Pitfalls: HIGH — derived from verified library behaviors and codebase patterns

**Research date:** 2026-05-22
**Valid until:** 2026-07-22 (stable libraries; Recharts/TanStack Table change slowly)
