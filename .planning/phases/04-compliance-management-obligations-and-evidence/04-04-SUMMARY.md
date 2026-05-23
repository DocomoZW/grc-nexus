---
phase: 04-compliance-management-obligations-and-evidence
plan: 04
subsystem: compliance-ui
tags: [dashboard, tanstack-table, server-component, client-component, react-hook-form, zod, filter-bar]
dependency_graph:
  requires:
    - 04-01  # compliance schema, types, compliance-utils (OBLIGATION_STATUS_BADGE, computeCompliancePercentage)
    - 04-02  # Server Actions (createObligation), query helpers (getComplianceStats, listObligations)
  provides:
    - Compliance posture dashboard with 3 dynamic stat cards (force-dynamic Server Component)
    - Obligations list page with ObligationsTable (TanStack Table + client-side filtering)
    - ObligationFilterBar with framework/status/owner filters and active ring + clear button
    - Create obligation form with all 6 fields, conditional framework_reference, gold CTA
  affects:
    - app/(protected)/compliance/page.tsx          # new compliance dashboard route
    - app/(protected)/compliance/obligations/page.tsx  # new obligations list route
tech_stack:
  added: []
  patterns:
    - Server Component dashboard with parallel getComplianceStats + listObligations queries
    - TanStack Table v8 client-side filtering with filterFn (value === 'all' || ...)
    - ObligationRow normalization: user_profiles join → owner_name string in Server Component
    - Dynamic stat card color semantics: text-ok/text-warn/text-err based on threshold values
    - Conditional required asterisk via watch('framework') from react-hook-form
    - createObligation in startTransition → redirect to detail page on success
key_files:
  created:
    - components/compliance/ComplianceStatCard.tsx
    - app/(protected)/compliance/page.tsx
    - app/(protected)/compliance/obligations/page.tsx
    - app/(protected)/compliance/obligations/ObligationsTable.tsx
    - components/compliance/ObligationFilterBar.tsx
    - app/(protected)/compliance/obligations/new/page.tsx
    - app/(protected)/compliance/obligations/new/ObligationForm.tsx
  modified: []
decisions:
  - "stats.obligations cast as unknown as { status: ObligationStatus }[] — compliance_obligations not yet in generated types/supabase.ts (same pattern as prior plans)"
  - "evidence_count stubbed as 0 in obligations list — listObligations query is list-optimized and does not include a count join; detail page will show real evidence; column still renders correctly"
  - "FrameworkBadge defined inline in both dashboard and ObligationsTable — not extracted to shared component since it is only 10 lines and keeps each file self-contained"
  - "ObligationFilterBar uses onFilterChange callback pattern (columnId + value) rather than RiskFilterBar's named props — more flexible for arbitrary column IDs"
  - "ObligationsTable isExpiringSoon computed inline using Date arithmetic — date-fns was not used to avoid adding an import for a 2-line calculation"
metrics:
  duration: ~9 minutes
  completed: "2026-05-23"
  tasks_completed: 2
  files_created: 7
  files_modified: 0
---

# Phase 04 Plan 04: Compliance UI — Dashboard, Obligations Table, and Create Form Summary

Compliance posture dashboard with 3 dynamic stat cards, obligations list page with TanStack Table client-side filtering and row styling, ObligationFilterBar, and create obligation form with conditional framework_reference field — all TypeScript-clean.

## What Was Built

### Task 1: ComplianceStatCard + Compliance Posture Dashboard (committed `950be66`)

**`components/compliance/ComplianceStatCard.tsx`** — Standalone stat card component (UI-SPEC Component 31):
- Accepts `icon: LucideIcon`, `label`, `value`, `accent`, `description` props
- Uses `cn()` to apply accent color to both the icon and the value number
- Renders: icon + uppercase label row, large DM Mono value, optional description

**`app/(protected)/compliance/page.tsx`** — Server Component dashboard (UI-SPEC Screen 1):
- `export const dynamic = 'force-dynamic'` as first export after imports
- Auth guard mirrors `app/(protected)/risk/page.tsx` exactly (getUser, redirect, role check)
- VIEW_ROLES: `['admin', 'ceo', 'compliance-officer', 'risk-officer', 'audit-officer', 'board-member']` — excludes `dept-head` per D-32
- `getComplianceStats` and `listObligations` called in `Promise.all`
- `stats.obligations` cast via `as unknown as { status: ObligationStatus }[]` before passing to `computeCompliancePercentage` (types/supabase.ts not yet regenerated)
- Compliance rate accent: `text-ok` ≥ 80%, `text-warn` 50–79%, `text-err` < 50%
- Overdue count accent: `text-err` if > 0, `text-ok` if 0
- Expiring count accent: `text-warn` if > 0, `text-ok` if 0
- 3 `ComplianceStatCard` components rendered with descriptions
- Overdue `<Alert variant="destructive">` shown only when `overdueCount > 0`
- Obligations preview table: first 5 rows, columns: Title / Framework / Due Date / Status
- Empty state with ClipboardList icon and gold Add Obligation CTA
- Inline `FrameworkBadge` component using exact UI-SPEC Component 30 class strings

### Task 2: Obligations List, Table, Filter Bar, Create Form (committed `1e0be7d`)

**`app/(protected)/compliance/obligations/page.tsx`** — Server Component shell:
- Mirrors `app/(protected)/risk/register/page.tsx` exactly
- `force-dynamic`, auth guard, same role list as dashboard
- Calls `listObligations(supabase)`, casts result, normalizes to `ObligationRow[]`
- Owner name resolution: `[owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || 'Unassigned'`
- Passes `normalizedRows` to `<ObligationsTable rows={normalizedRows} />`

**`app/(protected)/compliance/obligations/ObligationsTable.tsx`** — Client Component TanStack Table:
- `'use client'` as first line
- Columns in order: Title (sortable, link) / Framework (badge, filterable, sortable) / Due Date (DM Mono, sortable, `text-err` if overdue) / Status (obligation status badge, filterable, sortable) / Owner (name, sortable) / owner_id (hidden, filterable) / Evidence (chip count) / Actions (View + Edit with Tooltip)
- `filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value` on framework, status, owner_id columns
- Row styling: `border-l-[3px] border-l-err bg-err/5` for overdue; `border-l-[3px] border-l-warn` for expiring within 7 days and not compliant/waived
- `getFilteredRowModel` imported and wired
- View/Edit action buttons use Tooltip + Button ghost + asChild + Link pattern from plan spec
- Empty state: SearchX icon + "Clear filters" when filters active; ClipboardList + gold CTA when no data
- `ObligationFilterBar` receives `onFilterChange(columnId, value)` callback

**`components/compliance/ObligationFilterBar.tsx`** — Client Component filter bar:
- 3 Select components: Framework (200px), Status (180px), Owner (200px)
- Framework options: 'all' + all 8 REGULATORY_FRAMEWORK_LABELS entries
- Status options: 'all' + all 6 OBLIGATION_STATUS_LABELS entries
- Active ring: `ring-2 ring-gold/50` on Select when value !== 'all'
- Clear filters Button (outline) shown only when `hasActiveFilters`
- `onFilterChange(columnId: string, value: string)` callback pattern

**`app/(protected)/compliance/obligations/new/page.tsx`** — Server Component shell:
- WRITE_ROLES: `['admin', 'compliance-officer']`
- Fetches `user_profiles` ordered by `first_name` for owner dropdown
- Renders `<ObligationForm users={users} />`

**`app/(protected)/compliance/obligations/new/ObligationForm.tsx`** — Client Component form:
- `'use client'` as first line
- `useForm` with `zodResolver(obligationSchema)`, `mode: 'onBlur'`
- `watch('framework')` used via `form.watch('framework')` → `isOtherFramework` boolean
- Conditional required asterisk on `framework_reference` label when `isOtherFramework`
- 6 fields in order: title / description / framework / framework_reference / owner_id / due_date
- `createObligation` called in `startTransition` inside `onSubmit`
- Redirect: `router.push(`/compliance/obligations/${result.data.id}`)` on success
- Error: `<Alert variant="destructive" role="alert" aria-live="assertive">`
- Submit button: gold, "Save Obligation", Loader2 spinner when isPending, disabled when isPending
- Cancel button: outline, "Back to Obligations", pushes to `/compliance/obligations`

---

## Owner Name Resolution

`listObligations` selects `user_profiles!owner_id ( first_name, last_name )` via Supabase foreign key join. In the Server Component page, the result is cast to a typed row shape that includes `user_profiles: { first_name, last_name } | null`. The `owner_name` is computed as:

```typescript
const owner = row.user_profiles
owner_name: [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || 'Unassigned'
```

This handles null owner (no assignment), partial names (first only or last only), and unknown profiles gracefully.

---

## framework_reference Conditional Requirement

In `ObligationForm`, the Zod schema (`obligationSchema`) already handles conditional validation via `.refine()` — it rejects an empty `framework_reference` when `framework === 'other'`. In the form UI:

```typescript
const watchedFramework = form.watch('framework')
const isOtherFramework = watchedFramework === 'other'
```

The `framework_reference` field is always rendered (not conditionally mounted). The required asterisk (`<span className="text-err"> *</span>`) is shown on the label only when `isOtherFramework` is true. The `FormDescription` text also conditionally adds "Required when framework is set to Other." This provides clear UX without conditional field mounting (which would lose the field value on framework change).

---

## ObligationsTable Column Order

1. Title (flex-1, sortable, link to detail)
2. Framework (badge with color per framework, 120px, filterable + sortable)
3. Due Date (DM Mono, 110px, `text-err font-semibold` if overdue, sortable)
4. Status (obligation status badge, 140px, filterable + sortable)
5. Owner (owner_name display, 140px, sortable)
6. owner_id (hidden column — used only for filter state)
7. Evidence (count chip, 80px, sortable)
8. Actions (View + Edit icon buttons with Tooltip, 80px)

---

## Pattern Deviations from Risk Register Analog

| Aspect | Risk Register | Obligations Table | Reason |
|--------|--------------|-------------------|--------|
| Filter callback | Named props (`category`, `severity`, `owner`, `status`) | Generic `onFilterChange(columnId, value)` | More flexible; avoids adding new props when adding new filter columns |
| Row styling | No left border accent | `border-l-[3px]` for overdue (err) and expiring (warn) | UI-SPEC compliance requirement for obligation urgency visual cues |
| Empty state | Single "No risks match..." message | Two states: filter empty vs. no data | Better UX disambiguation — filters can be cleared, no data needs creation CTA |
| evidence_count | N/A | Stubbed as 0 (see Known Stubs) | listObligations is list-optimized; count join deferred to detail page |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cast stats.obligations for computeCompliancePercentage**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `stats.obligations` is typed as `{ status: unknown }[]` because `compliance_obligations` is not yet in generated `types/supabase.ts` — `computeCompliancePercentage` expects `{ status: ObligationStatus }[]`
- **Fix:** Added `as unknown as { status: ObligationStatus }[]` cast before calling `computeCompliancePercentage` and the filter operations — consistent with the pattern used in prior plans (04-02 `ObligationEscalationTarget`)
- **Files modified:** `app/(protected)/compliance/page.tsx`
- **Commit:** `950be66`

---

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `app/(protected)/compliance/obligations/page.tsx` | 60 | `evidence_count: 0` | `listObligations` query does not include an evidence count join (list-optimized query). The Evidence column in the table shows 0 for all rows. Plan 05 (obligation detail page) will render actual evidence lists. This does not prevent the plan's goal — obligations list and filtering work correctly. |

---

## Threat Surface Scan

No new network endpoints introduced. All compliance pages use `force-dynamic` (T-4-04-I2). Auth guards use `supabase.auth.getUser()` not `getSession()` (T-4-04-S). VIEW_ROLES excludes `dept-head` (T-4-04-E). `createObligation` Server Action enforces WRITE_ROLES and Zod validation server-side (T-4-04-T).

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-4-04-S | Server Action calls getWriteContext(WRITE_ROLES) | Implemented in lib/compliance/actions.ts (04-02) |
| T-4-04-I | listObligations uses authenticated supabase client; RLS institution_id filter | Implemented in lib/compliance/queries.ts (04-02) |
| T-4-04-I2 | export const dynamic = 'force-dynamic' on all compliance pages | Confirmed on both page.tsx files |
| T-4-04-T | Zod obligationSchema.refine() validates framework_reference | Implemented in lib/schemas/compliance.ts (04-01) |
| T-4-04-E | VIEW_ROLES excludes dept-head | Confirmed in both page.tsx files |

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `components/compliance/ComplianceStatCard.tsx` | FOUND |
| `app/(protected)/compliance/page.tsx` | FOUND |
| `app/(protected)/compliance/obligations/page.tsx` | FOUND |
| `app/(protected)/compliance/obligations/ObligationsTable.tsx` | FOUND |
| `components/compliance/ObligationFilterBar.tsx` | FOUND |
| `app/(protected)/compliance/obligations/new/page.tsx` | FOUND |
| `app/(protected)/compliance/obligations/new/ObligationForm.tsx` | FOUND |
| commit `950be66` (Task 1) | FOUND |
| commit `1e0be7d` (Task 2) | FOUND |
| `npx tsc --noEmit` | PASSED (0 errors) |
| `export const dynamic = 'force-dynamic'` in compliance/page.tsx | CONFIRMED |
| `export const dynamic = 'force-dynamic'` in obligations/page.tsx | CONFIRMED |
| `useReactTable` in ObligationsTable | CONFIRMED |
| `createObligation` in ObligationForm | CONFIRMED |
| `getComplianceStats` in dashboard | CONFIRMED |
| `ComplianceStatCard` appears 3+ times in dashboard | CONFIRMED (4 lines: 1 import + 3 usages) |
| `getFilteredRowModel` in ObligationsTable | CONFIRMED |
| `'use client'` first line in ObligationsTable | CONFIRMED |
| `'use client'` first line in ObligationForm | CONFIRMED |
| `watch('framework')` in ObligationForm | CONFIRMED |
| `border-l-[3px] border-l-err` in ObligationsTable | CONFIRMED |
