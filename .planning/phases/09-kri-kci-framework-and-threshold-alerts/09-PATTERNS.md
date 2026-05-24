# Phase 9: KRI/KCI Framework and Threshold Alerts - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 28 new/modified files
**Analogs found:** 27 / 28

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20260525000001_kri_schema.sql` | migration | CRUD | `supabase/migrations/20260522000007_strategic_schema.sql` | exact |
| `supabase/migrations/20260525000002_kri_rls.sql` | migration | CRUD | `supabase/migrations/20260522000008_strategic_rls.sql` | exact |
| `supabase/migrations/20260525000003_kri_triggers.sql` | migration | event-driven | `supabase/migrations/20260522000009_strategic_triggers.sql` | exact |
| `supabase/migrations/20260525000004_kci_schema.sql` | migration | CRUD | `supabase/migrations/20260522000017_risk_schema.sql` | exact |
| `supabase/migrations/20260525000005_kci_rls.sql` | migration | CRUD | `supabase/migrations/20260522000018_risk_rls.sql` | exact |
| `supabase/migrations/20260525000006_kci_triggers.sql` | migration | event-driven | `supabase/migrations/20260522000019_risk_triggers.sql` | exact |
| `types/kri.ts` | model | CRUD | `types/auth.ts` (type file shape) | role-match |
| `types/kci.ts` | model | CRUD | `types/auth.ts` (type file shape) | role-match |
| `lib/schemas/kri.ts` | utility | transform | `lib/schemas/strategic.ts` | exact |
| `lib/schemas/kci.ts` | utility | transform | `lib/schemas/strategic.ts` | exact |
| `lib/risk/kri-utils.ts` | utility | transform | `lib/strategic/kpi-utils.ts` | exact |
| `lib/audit/kci-utils.ts` | utility | transform | `lib/strategic/kpi-utils.ts` | exact |
| `lib/risk/kri-actions.ts` | service | request-response | `lib/strategic/actions.ts` | exact |
| `lib/audit/kci-actions.ts` | service | request-response | `lib/strategic/actions.ts` | exact |
| `lib/risk/kri-queries.ts` | service | CRUD | `lib/strategic/queries.ts` | exact |
| `lib/audit/kci-queries.ts` | service | CRUD | `lib/strategic/queries.ts` | exact |
| `lib/risk/kri-alert.ts` | service | event-driven | `lib/compliance/escalation.ts` | exact |
| `lib/audit/kci-alert.ts` | service | event-driven | `lib/compliance/escalation.ts` | exact |
| `app/api/kri/alert/route.ts` | controller | request-response | `app/api/compliance/escalate/route.ts` | exact |
| `app/api/kci/alert/route.ts` | controller | request-response | `app/api/compliance/escalate/route.ts` | exact |
| `app/(protected)/risk/kris/page.tsx` | component | request-response | `app/(protected)/risk/register/page.tsx` | exact |
| `app/(protected)/risk/kris/new/page.tsx` | component | request-response | `app/(protected)/strategic/kpis/new/page.tsx` | exact |
| `app/(protected)/risk/kris/new/KriForm.tsx` | component | request-response | `app/(protected)/strategic/kpis/new/KpiForm.tsx` | exact |
| `app/(protected)/risk/kris/[id]/page.tsx` | component | request-response | `app/(protected)/strategic/kpis/[id]/page.tsx` | exact |
| `app/(protected)/risk/kris/[id]/readings/new/page.tsx` | component | request-response | `app/(protected)/strategic/kpis/new/page.tsx` | role-match |
| `app/(protected)/risk/kris/[id]/readings/new/KriReadingForm.tsx` | component | request-response | `app/(protected)/strategic/kpis/new/KpiForm.tsx` | role-match |
| `app/(protected)/audit/kcis/` (all files) | component | request-response | `app/(protected)/risk/kris/` (mirror) | role-match |
| `components/indicators/IndicatorSparkline.tsx` | component | transform | `app/(protected)/strategic/KpiSparkline.tsx` | exact |
| `components/indicators/IndicatorStatusBadge.tsx` | component | transform | `lib/risk/risk-utils.ts` RISK_SEVERITY_BADGE | role-match |
| `components/layout/SidebarLayout.tsx` (modified) | component | event-driven | self | exact |
| `app/(protected)/dashboard/page.tsx` (modified) | component | request-response | self | exact |
| `app/(protected)/risk/page.tsx` (modified) | component | request-response | self | exact |
| `app/(protected)/audit/page.tsx` (modified) | component | request-response | self | exact |

---

## Pattern Assignments

### `supabase/migrations/20260525000001_kri_schema.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260522000007_strategic_schema.sql`

**Enum definition pattern** (lines 29–34):
```sql
create type public.kpi_frequency as enum (
  'monthly',
  'quarterly',
  'semi_annual',
  'annual'
);
```
Reuse `public.kpi_frequency` for `reporting_frequency`. Add two new enums:
```sql
create type public.indicator_status as enum (
  'on_track', 'at_risk', 'breached', 'no_data'
);
create type public.indicator_direction as enum (
  'lower_is_worse', 'higher_is_worse'
);
```

**Table definition pattern** (lines 64–101):
```sql
create table public.kpis (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete restrict,
  objective_id        uuid not null references public.strategic_objectives(id) on delete cascade,
  title               text not null,
  description         text,
  owner_id            uuid references auth.users(id) on delete set null,
  ...
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_kpis_institution_id on public.kpis (institution_id);
create index idx_kpis_objective_id   on public.kpis (objective_id);
create index idx_kpis_owner_id       on public.kpis (owner_id);
```
`kri_definitions` follows this exactly. Replace `objective_id not null` with `risk_id uuid references public.risks(id) on delete set null` (optional FK). Add `alert_threshold numeric not null`, `direction public.indicator_direction not null default 'lower_is_worse'`.

**Readings table pattern** (lines 88–101):
```sql
create table public.kpi_readings (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete restrict,
  kpi_id           uuid not null references public.kpis(id) on delete cascade,
  reporting_period text not null,
  actual_value     numeric not null,
  notes            text,
  recorded_by      uuid references auth.users(id) on delete set null,
  recorded_at      timestamptz not null default now()
);
create index idx_kpi_readings_institution_id on public.kpi_readings (institution_id);
create index idx_kpi_readings_kpi_id         on public.kpi_readings (kpi_id);
create index idx_kpi_readings_recorded_at    on public.kpi_readings (recorded_at desc);
```
`kri_readings` replaces `reporting_period text` with `period_start date not null, period_end date not null` and adds `status public.indicator_status not null default 'no_data'`.

---

### `supabase/migrations/20260525000002_kri_rls.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260522000008_strategic_rls.sql`

**RLS enable + select policy pattern** (lines 11–16):
```sql
alter table public.kpis enable row level security;
alter table public.kpis force row level security;

create policy "kpis_select" on public.kpis
  for select to authenticated
  using (institution_id = (select public.institution_id()));
```

**Insert + update policy with role guard** (lines 17–31):
```sql
create policy "kpis_insert" on public.kpis
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'risk-officer')
  );

create policy "kpis_update" on public.kpis
  for update to authenticated
  using (institution_id = (select public.institution_id()))
  with check (
    institution_id = (select public.institution_id())
    and (select public.active_role()) in ('admin', 'ceo', 'risk-officer')
  );
```
`kri_definitions` uses same roles. `kri_readings` insert policy uses owner-or-admin pattern:
```sql
-- from strategic_rls.sql lines 73–79
create policy "kpi_readings_insert" on public.kpi_readings
  for insert to authenticated
  with check (
    institution_id = (select public.institution_id())
    and (
      (select public.active_role()) = 'admin'
      or recorded_by = auth.uid()
    )
  );
```
`kri_readings` has NO update policy (append-only — same as `kpi_readings`).

---

### `supabase/migrations/20260525000003_kri_triggers.sql` (migration, event-driven)

**Analog:** `supabase/migrations/20260522000009_strategic_triggers.sql`

**Full file pattern** (lines 1–8):
```sql
-- Migration: 20260522000009_strategic_triggers.sql
select audit.attach_audit_trigger('strategic_objectives');
select audit.attach_audit_trigger('kpis');
select audit.attach_audit_trigger('kpi_readings');
```
KRI version:
```sql
select audit.attach_audit_trigger('kri_definitions');
select audit.attach_audit_trigger('kri_readings');
```

---

### `supabase/migrations/20260525000004_kci_schema.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260522000017_risk_schema.sql`

**FK to parent table pattern** (lines 59–77, `risk_treatments` referencing `risks`):
```sql
create table public.risk_treatments (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  risk_id        uuid not null references public.risks(id) on delete cascade,
  ...
);
```
`kci_definitions` replaces the FK: `treatment_id uuid references public.risk_treatments(id) on delete set null`. Uses `indicator_status` and `indicator_direction` enums from migration 20260525000001.

---

### `supabase/migrations/20260525000005_kci_rls.sql` and `20260525000006_kci_triggers.sql`

**Analog:** `supabase/migrations/20260522000018_risk_rls.sql` and `20260522000019_risk_triggers.sql`

Same structure as KRI RLS/triggers. Substitute `kci_definitions`/`kci_readings` table names and `['admin', 'audit-officer']` role list for insert/update on `kci_definitions`.

---

### `lib/schemas/kri.ts` (utility, transform)

**Analog:** `lib/schemas/strategic.ts`

**numericField helper** (lines 47–54):
```typescript
const numericField = (errorMessage: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number({ invalid_type_error: errorMessage }),
  )
```
Copy this helper verbatim at the top of `lib/schemas/kri.ts` — do not import it from strategic (it is not exported).

**Schema shape pattern** (lines 58–80):
```typescript
export const kpiSchema = z.object({
  objective_id:        z.string().uuid('Objective must be selected.'),
  title:               z.string().min(1, 'Title is required.'),
  description:         z.string().optional(),
  owner_id:            z.string().uuid('Owner must be a valid user.'),
  baseline_value:      numericField('Baseline must be a number.'),
  target_value:        numericField('Target must be a number.'),
  unit_of_measure:     z.string().min(1, 'Unit of measure is required.'),
  reporting_frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual'], { ... }),
})
export type KpiInput = z.infer<typeof kpiSchema>
```
`kriDefinitionSchema` adds `alert_threshold: numericField(...)`, `direction: z.enum(['lower_is_worse', 'higher_is_worse'])`, and `risk_id: z.string().uuid().optional().nullable()`. Omit `baseline_value`.

**Reading schema pattern** (lines 76–81):
```typescript
export const kpiReadingSchema = z.object({
  reporting_period: z.string().min(1, 'Reporting period is required.'),
  actual_value:     numericField('Actual value must be a number.'),
  notes:            z.string().optional(),
})
```
`kriReadingSchema` replaces `reporting_period` with `period_start` and `period_end` (both `z.string().min(1, ...)`).

---

### `lib/risk/kri-utils.ts` (utility, transform)

**Analog:** `lib/strategic/kpi-utils.ts`

**Export type + constant pattern** (lines 1–8):
```typescript
// lib/strategic/kpi-utils.ts
export const KPI_ON_TRACK_THRESHOLD = 0.90
export const KPI_AT_RISK_THRESHOLD  = 0.70
export type KpiStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data'
```

**Status calculation function pattern** (lines 20–35):
```typescript
export function calculateKpiStatus(
  actualValue: number | null | undefined,
  targetValue: number,
): KpiStatus {
  if (actualValue === null || actualValue === undefined) return 'no_data'
  if (targetValue === 0) return 'no_data'
  const ratio = actualValue / targetValue
  if (ratio >= KPI_ON_TRACK_THRESHOLD) return 'on_track'
  if (ratio >= KPI_AT_RISK_THRESHOLD)  return 'at_risk'
  return 'off_track'
}
```
`calculateIndicatorStatus()` replaces ratio logic with absolute-value + direction branching. Signature: `(actualValue, targetValue, alertThreshold, direction)`.

**Status badge record pattern** (lines 42–47):
```typescript
export const KPI_STATUS_BADGE: Record<KpiStatus, { label: string; className: string }> = {
  on_track:  { label: 'On Track',  className: 'bg-ok/10 text-ok border-ok/30' },
  at_risk:   { label: 'At Risk',   className: 'bg-warn/10 text-warn border-warn/30' },
  off_track: { label: 'Off Track', className: 'bg-err/10 text-err border-err/30' },
  no_data:   { label: 'No Data',   className: 'bg-paper text-navy-mid border-paper-border' },
}
```
`INDICATOR_STATUS_BADGE` replaces `off_track` with `breached: { label: 'Breached', className: 'bg-err/10 text-err border-err/30' }`. All other entries copy exactly.

---

### `lib/risk/kri-actions.ts` (service, request-response)

**Analog:** `lib/strategic/actions.ts`

**File header + directive** (lines 1–10):
```typescript
'use server'
// lib/strategic/actions.ts
// SECURITY: Zod safeParse before any DB call — strips unknown fields.
// SECURITY: Role checked via user.app_metadata (JWT claim) — not DB query.
// SECURITY: institutionId sourced ONLY from user.app_metadata.institution_id (JWT claim).
```

**Role set constants** (lines 23–26):
```typescript
const OBJECTIVE_ROLES = ['admin', 'ceo'] as const
const KPI_ROLES       = ['admin', 'ceo', 'risk-officer'] as const
const GENERIC_ERROR   = 'An unexpected error occurred. If this persists, contact your administrator.'
```
KRI version: `const KRI_WRITE_ROLES = ['admin', 'ceo', 'risk-officer'] as const`

**Create action full pattern** (lines 197–242, `createKpi`):
```typescript
export async function createKpi(
  values: KpiInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kpiSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta       = user.app_metadata as Record<string, string>
    const activeRole    = appMeta?.active_role
    const institutionId = appMeta?.institution_id

    if (!KPI_ROLES.includes(activeRole as typeof KPI_ROLES[number])) {
      return { error: 'You do not have permission to create KPIs.' }
    }

    const { data, error } = await supabase
      .from('kpis')
      .insert({
        ...parsed.data,
        institution_id: institutionId,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createKpi] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath(`/strategic/objectives/${parsed.data.objective_id}`)
    revalidatePath('/strategic')

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createKpi] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
```

**Record reading with owner check** (lines 298–357, `recordKpiReading`):
```typescript
export async function recordKpiReading(
  kpiId: string,
  values: KpiReadingInput,
): Promise<{ error: string } | { data: { id: string } }> {
  const parsed = kpiReadingSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized.' }

    const appMeta    = user.app_metadata as Record<string, string>
    const activeRole = appMeta?.active_role

    const { data: kpi, error: kpiError } = await supabase
      .from('kpis')
      .select('owner_id, institution_id')
      .eq('id', kpiId)
      .single()

    if (kpiError || !kpi) {
      return { error: 'KPI not found.' }
    }

    const kpiRecord = kpi as { owner_id: string; institution_id: string }
    if (kpiRecord.owner_id !== user.id && activeRole !== 'admin') {
      return { error: 'Only the KPI owner or an administrator can record readings.' }
    }

    const { data, error } = await supabase
      .from('kpi_readings')
      .insert({
        ...parsed.data,
        kpi_id: kpiId,
        institution_id: kpiRecord.institution_id,
        recorded_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[recordKpiReading] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath(`/strategic/kpis/${kpiId}`)
    revalidatePath('/strategic')

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[recordKpiReading] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
```
`recordKriReading` must also call `calculateIndicatorStatus()` and persist the computed `status` in the insert payload before calling `.insert()`. This prevents the reading status column from defaulting to `no_data` permanently.

---

### `lib/risk/kri-queries.ts` (service, CRUD)

**Analog:** `lib/strategic/queries.ts`

**File header + import** (lines 1–6):
```typescript
// lib/strategic/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
export const KPI_PAGE_SIZE = 20
```

**Main list query with embedded readings** (lines 15–47, `getKpisWithReadings`):
```typescript
export async function getKpisWithReadings(
  supabase: SupabaseClient,
  { page = 1, objectiveId }: { page?: number; objectiveId?: string } = {}
) {
  let query = supabase
    .from('kpis')
    .select(
      `
      id,
      title,
      description,
      owner_id,
      baseline_value,
      target_value,
      unit_of_measure,
      reporting_frequency,
      objective_id,
      strategic_objectives ( id, title ),
      kpi_readings ( actual_value, reporting_period, recorded_at ),
      user_profiles!owner_id ( first_name, last_name )
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
  ...
  return { data: data ?? [], count: count ?? 0, error }
}
```
`getKrisWithReadings` uses `kri_definitions` table and embeds `kri_readings ( actual_value, period_start, period_end, status, recorded_at )`. Also embed `risks ( id, title )` for optional risk link.

**Latest reading helper** (lines 82–89):
```typescript
export function getLatestReading(
  readings: { actual_value: number; reporting_period: string; recorded_at: string }[]
): { actual_value: number; reporting_period: string; recorded_at: string } | null {
  if (!readings || readings.length === 0) return null
  return [...readings].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )[0]
}
```
`getLatestKriReading` updates type signature to `{ actual_value: number; period_start: string; period_end: string; status: string; recorded_at: string }`.

---

### `lib/risk/kri-alert.ts` (service, event-driven)

**Analog:** `lib/compliance/escalation.ts`

**Module-level setup** (lines 1–21):
```typescript
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const resend = new Resend(process.env.RESEND_API_KEY)
```
Copy verbatim — `escapeHtml` is private to this module.

**Alert function signature and admin client init** (lines 34–39):
```typescript
export async function sendComplianceEscalationEmails(
  obligations: ObligationEscalationTarget[],
): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient()
  let sent = 0
  let skipped = 0
```
KRI version: `sendKriBreachAlerts()` takes no arguments (queries DB internally). Same return type.

**Recipient assembly with Set deduplication** (lines 49–77):
```typescript
const recipients = new Set<string>()

if (obligation.owner_id) {
  const { data: ownerUser } = await admin.auth.admin.getUserById(obligation.owner_id)
  if (ownerUser?.user?.email) {
    recipients.add(ownerUser.user.email)
  }
}

const { data: adminProfiles } = await admin
  .from('user_profiles')
  .select('id')
  .eq('institution_id', obligation.institution_id)
  .eq('active_role', 'admin')

if (adminProfiles) {
  for (const profile of adminProfiles) {
    const { data: adminUser } = await admin.auth.admin.getUserById(
      (profile as { id: string }).id,
    )
    if (adminUser?.user?.email) {
      recipients.add(adminUser.user.email)
    }
  }
}

if (recipients.size === 0) {
  skipped++
  continue
}
```
KRI version queries `in('active_role', ['admin', 'ceo', 'risk-officer'])` instead of `.eq('active_role', 'admin')`.

**Email send with try/catch** (lines 90–108):
```typescript
try {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@grc-nexus.gov.zw',
    to: Array.from(recipients),
    subject: subjectMap[threshold],
    html: `...`,
  })
  sent++
} catch (emailErr) {
  console.error('[sendComplianceEscalationEmails] Email send error:', emailErr)
  skipped++
}
```
Copy pattern exactly. KRI alert deduplication: scope readings query to `recorded_at > (now() - interval '25 hours')` to avoid re-alerting on unchanged breaches daily.

---

### `app/api/kri/alert/route.ts` (controller, request-response)

**Analog:** `app/api/compliance/escalate/route.ts`

**Full file pattern** (lines 1–48):
```typescript
// app/api/compliance/escalate/route.ts
import { createClient } from '@/lib/supabase/server'
import { getObligationsForEscalation } from '@/lib/compliance/queries'
import { sendComplianceEscalationEmails } from '@/lib/compliance/escalation'

export async function POST(request: Request) {
  // CRON_SECRET guard — FIRST operation before any DB query
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = await createClient()
    const { data: obligations, error } = await getObligationsForEscalation(supabase)

    if (error) {
      console.error('[escalate] DB query error:', error)
      return Response.json({ error: 'Failed to query obligations' }, { status: 500 })
    }

    const result = await sendComplianceEscalationEmails(obligations)

    return Response.json({
      success: true,
      obligationsFound: obligations.length,
      emailsSent: result.sent,
      emailsSkipped: result.skipped,
    })
  } catch (err) {
    console.error('[escalate] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```
KRI route: no supabase client needed at route level (alert service queries internally via admin client). Simplify to:
```typescript
const result = await sendKriBreachAlerts()
return Response.json({ success: true, ...result })
```
CRON_SECRET guard is identical and must remain FIRST.

---

### `app/(protected)/risk/kris/page.tsx` (component, request-response)

**Analog:** `app/(protected)/risk/register/page.tsx`

**Page shell pattern** (lines 1–12):
```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { listRisks } from '@/lib/risk/queries'
...
export const dynamic = 'force-dynamic'

const VIEW_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member', 'dept-head']
```

**Auth + role guard pattern** (lines 34–46):
```typescript
export default async function RiskRegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined

  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }
  ...
}
```

**Page header with action link** (lines 68–80):
```typescript
return (
  <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-[20px] font-semibold text-navy-900">Risk Register</h1>
        <p className="mt-1 text-[14px] text-navy-mid">{normalizedRows.length} risks total</p>
      </div>
      <Link
        href="/risk/new"
        className="inline-flex items-center rounded-[8px] bg-gold px-4 py-2 text-[13px] font-medium text-navy-950 hover:bg-gold-hi"
      >
        Add Risk
      </Link>
    </div>
    ...
  </div>
)
```

---

### `app/(protected)/risk/kris/new/page.tsx` (component, request-response)

**Analog:** `app/(protected)/strategic/kpis/new/page.tsx`

**Full page shell pattern** (lines 1–46):
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiForm } from './KpiForm'
import type { AppRole } from '@/types/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Create KPI — GRC-Nexus' }

const CREATE_KPI_ROLES: AppRole[] = ['admin', 'ceo', 'risk-officer']

export default async function NewKpiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  if (!activeRole || !CREATE_KPI_ROLES.includes(activeRole)) {
    redirect('/strategic/objectives')
  }

  const [{ data: objectives }, { data: owners }] = await Promise.all([
    supabase.from('strategic_objectives').select('id, title').eq('status', 'active').order('title'),
    supabase.from('user_profiles').select('id, first_name, last_name').order('last_name'),
  ])
  ...
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-navy-900 font-body">Create KPI</h1>
      </div>
      <KpiForm objectives={objectiveOptions} owners={ownerOptions} />
    </div>
  )
}
```
KRI new page fetches `risks` (optional) and `user_profiles`. Parallel `Promise.all` pattern is identical.

---

### `app/(protected)/risk/kris/new/KriForm.tsx` (component, request-response)

**Analog:** `app/(protected)/strategic/kpis/new/KpiForm.tsx`

**Client component setup** (lines 1–29):
```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { kpiSchema, type KpiInput } from '@/lib/schemas/strategic'
import { createKpi } from '@/lib/strategic/actions'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
```

**Form state + submit pattern** (lines 37–68):
```typescript
export function KpiForm({ objectives, owners }: KpiFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<KpiInput>({
    resolver: zodResolver(kpiSchema),
    defaultValues: { ... },
    mode: 'onBlur',
  })

  function onSubmit(values: KpiInput) {
    setError(null)
    startTransition(async () => {
      const result = await createKpi(values)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.push(`/strategic/objectives/${values.objective_id}`)
      }
    })
  }
  ...
}
```

**Error alert + form wrapper pattern** (lines 70–80):
```typescript
return (
  <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-8">
    {error && (
      <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        ...
      </form>
    </Form>
  </div>
)
```

**Numeric field pattern** (lines 193–231, baseline + target side-by-side):
```typescript
<div className="flex gap-4 mt-4">
  <FormField
    control={form.control}
    name="baseline_value"
    render={({ field }) => (
      <FormItem className="flex-1">
        <FormLabel className="text-[14px] font-medium text-navy-900">Baseline Value</FormLabel>
        <FormControl>
          <Input type="number" placeholder="Current starting value" className="h-11 border-paper-border" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  ...
</div>
```
`KriForm` uses same pattern for `target_value` and `alert_threshold` side-by-side. Add a `Select` for `direction` enum. Add optional `Select` for `risk_id`.

**Submit button pattern** (lines 257–264):
```typescript
<Button
  type="submit"
  className="mt-6 h-11 bg-gold text-navy-950 hover:bg-gold-hi font-semibold text-[14px] px-8"
  disabled={isPending}
>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Create KPI
</Button>
```

---

### `app/(protected)/risk/kris/[id]/page.tsx` (component, request-response)

**Analog:** `app/(protected)/strategic/kpis/[id]/page.tsx`

**Page-level exports and imports** (lines 1–16):
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { calculateKpiStatus, KPI_STATUS_BADGE } from '@/lib/strategic/kpi-utils'
import { getLatestReading } from '@/lib/strategic/queries'
import type { AppRole, AppMetadata } from '@/types/auth'

export const dynamic = 'force-dynamic'
```

**Auth + data fetch** (lines 43–72):
```typescript
export default async function KpiDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Partial<AppMetadata>
  const activeRole = appMeta?.active_role as AppRole | undefined

  const { data: kpi } = await supabase
    .from('kpis')
    .select('*, strategic_objectives(id, title), user_profiles!owner_id(first_name, last_name)')
    .eq('id', params.id)
    .single()

  if (!kpi) redirect('/strategic')
  ...
  const { data: readings } = await supabase
    .from('kpi_readings')
    .select('*')
    .eq('kpi_id', params.id)
    .order('recorded_at', { ascending: false })
  ...
  const canRecord = activeRole === 'admin' || user.id === kpiRow.owner_id
}
```

**Record Reading button (role-gated)** (lines 101–109):
```typescript
{canRecord && (
  <Link
    href={`/strategic/kpis/${params.id}/readings/new`}
    className="inline-flex items-center px-4 py-2 rounded-[8px] bg-gold text-navy-950 hover:bg-gold-hi text-[13px] font-medium shadow-card transition-colors"
  >
    Record Reading
  </Link>
)}
```

**Reading history table** (lines 175–200):
```typescript
<table className="w-full">
  <thead>
    <tr className="bg-paper border-b border-paper-border">
      <th className="text-left text-[13px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">Period</th>
      <th className="text-left text-[13px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">Actual Value</th>
      <th className="text-left text-[13px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">Notes</th>
      <th className="text-left text-[13px] font-semibold uppercase tracking-wider text-navy-mid px-4 py-3">Recorded At</th>
    </tr>
  </thead>
  <tbody>
    {kpiReadings.map((r) => (
      <tr key={r.id} className="border-b border-paper-border last:border-0">
        <td className="text-[13px] text-navy-900 px-4 py-3 font-mono">{r.reporting_period}</td>
        <td className="text-[13px] text-navy-900 px-4 py-3 font-mono">{r.actual_value} {kpiRow.unit_of_measure}</td>
        <td className="text-[13px] text-navy-mid px-4 py-3">{r.notes ?? '—'}</td>
        <td className="text-[13px] text-navy-900 px-4 py-3 font-mono">{format(new Date(r.recorded_at), 'yyyy-MM-dd HH:mm')}</td>
      </tr>
    ))}
  </tbody>
</table>
```
KRI detail page adds `Status` column with `IndicatorStatusBadge`. Replace `reporting_period` column with two columns: `Period Start` and `Period End`. Add `IndicatorSparkline` in the detail card above the readings table.

---

### `components/indicators/IndicatorSparkline.tsx` (component, transform)

**Analog:** `app/(protected)/strategic/KpiSparkline.tsx`

**Full file pattern** (lines 1–52):
```typescript
'use client'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { KpiStatus } from '@/lib/strategic/kpi-utils'

interface SparklineProps {
  readings: { actual_value: number; reporting_period: string }[]
  status: KpiStatus
}

const SPARKLINE_COLOR: Record<KpiStatus, string> = {
  on_track:  '#27AE60',
  at_risk:   '#E67E22',
  off_track: '#E74C3C',
  no_data:   '#D7E2EF',
}

export function KpiSparkline({ readings, status }: SparklineProps) {
  const data = [...readings]
    .sort((a, b) => a.reporting_period.localeCompare(b.reporting_period))
    .slice(-6)
    .map((r) => ({ value: r.actual_value }))

  if (data.length === 0) {
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
`IndicatorSparkline` changes: import `IndicatorStatus` from `@/lib/risk/kri-utils`, add `breached: '#E74C3C'` to color record, sort by `period_start` instead of `reporting_period`. Rename component to `IndicatorSparkline`.

---

### `components/layout/SidebarLayout.tsx` (modified)

**Analog:** `components/layout/SidebarLayout.tsx` (self-modification)

**NavItem interface and ALL_NAV_ITEMS array** (lines 19–56):
```typescript
interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  roles?: string[]
  excludeRoles?: string[]
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/strategic/objectives', label: 'Strategic', icon: Target },
  { href: '/risk', label: 'Risk', icon: ShieldAlert },
  ...
]
```
Add two entries after the existing `/risk` entry:
```typescript
{ href: '/risk/kris', label: 'KRIs', icon: TrendingDown,
  roles: ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member'] },
```
Add after the existing `/audit` entry:
```typescript
{ href: '/audit/kcis', label: 'KCIs', icon: Activity,
  roles: ['admin', 'ceo', 'audit-officer', 'risk-officer', 'board-member'] },
```
Add `TrendingDown` and `Activity` to the lucide-react import on line 6.

---

### `app/(protected)/risk/page.tsx` (modified)

**Analog:** `app/(protected)/risk/page.tsx` (self-modification, stat card pattern)

**Inline StatCard component pattern** (lines 113–120):
```typescript
function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-[10px] border border-paper-border bg-white p-4 shadow-card">
      <p className="text-[12px] uppercase tracking-wider text-navy-mid">{label}</p>
      <p className={`mt-2 font-mono text-[28px] font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
```
Add 3 new `StatCard` components in the grid for KRI counts (on_track / at_risk / breached). Add "View KRIs" quick link alongside existing links.

---

### `app/(protected)/dashboard/page.tsx` (modified)

**Analog:** `app/(protected)/dashboard/page.tsx` (self-modification)

**KpiSummaryCard tile pattern** (lines 169–191):
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <KpiSummaryCard
    title="Objectives"
    value={executiveData.kpi.objectivesTotal}
    subtitle="Strategic objectives in scope"
  />
  ...
</div>
```
Add KRI stat card and KCI health grid as new tiles in this grid. Source data from `getExecutiveDashboardData` extended with KRI/KCI counts, or a separate `getKriDashboardStats()` query following the same pattern.

---

## Shared Patterns

### Authentication Guard
**Source:** `lib/strategic/actions.ts` lines 48–57  
**Apply to:** All `kri-actions.ts`, `kci-actions.ts`, all `page.tsx` files
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: 'Unauthorized.' }

const appMeta       = user.app_metadata as Record<string, string>
const activeRole    = appMeta?.active_role
const institutionId = appMeta?.institution_id
```

### institution_id Source — JWT Only
**Source:** `lib/strategic/actions.ts` line 57  
**Apply to:** ALL new server actions and route handlers
```typescript
const institutionId = appMeta?.institution_id
// NEVER accept institution_id from form payload or query params
```

### CRON_SECRET Guard
**Source:** `app/api/compliance/escalate/route.ts` lines 20–25  
**Apply to:** `app/api/kri/alert/route.ts`, `app/api/kci/alert/route.ts`
```typescript
const secret = request.headers.get('x-cron-secret')
if (!secret || secret !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 })
}
```
This check must be the FIRST operation in the POST handler — before any DB query.

### Admin Client for Auth Lookups
**Source:** `lib/compliance/escalation.ts` lines 51–77  
**Apply to:** `lib/risk/kri-alert.ts`, `lib/audit/kci-alert.ts`
```typescript
const { data: ownerUser } = await admin.auth.admin.getUserById(def.owner_id)
```
RLS client cannot query `auth.users`. Use `createAdminClient()` for all email resolution in alert services.

### escapeHtml in Emails
**Source:** `lib/compliance/escalation.ts` lines 13–19  
**Apply to:** `lib/risk/kri-alert.ts`, `lib/audit/kci-alert.ts`
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```
Apply to ALL user-supplied strings embedded in email HTML bodies (title, unit_of_measure).

### Zod safeParse Before DB
**Source:** `lib/strategic/actions.ts` lines 40–46  
**Apply to:** All server actions
```typescript
const parsed = schema.safeParse(values)
if (!parsed.success) {
  return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
}
```

### Generic Error Message
**Source:** `lib/strategic/actions.ts` line 31  
**Apply to:** All server actions
```typescript
const GENERIC_ERROR = 'An unexpected error occurred. If this persists, contact your administrator.'
```
Internal errors go to `console.error` only — never expose DB error details to client.

### force-dynamic on Protected Pages
**Source:** `app/(protected)/strategic/kpis/[id]/page.tsx` line 16  
**Apply to:** Every new `page.tsx` under `/risk/kris/` and `/audit/kcis/`
```typescript
export const dynamic = 'force-dynamic'
```

### Status Computed on Insert (Critical)
**Source:** Pitfall 1 from RESEARCH.md  
**Apply to:** `recordKriReading` and `recordKciReading` actions  
Call `calculateIndicatorStatus(parsed.data.actual_value, kri.target_value, kri.alert_threshold, kri.direction)` inside the action before inserting. Persist the computed status into the readings row. Never rely on DB default `'no_data'`.

### Recipient Set Deduplication
**Source:** `lib/compliance/escalation.ts` line 49  
**Apply to:** `lib/risk/kri-alert.ts`, `lib/audit/kci-alert.ts`
```typescript
const recipients = new Set<string>()
```
Owner email and governance officer emails are collected into a `Set<string>` before sending. This prevents duplicate emails when the owner is also a governance officer.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `types/kri.ts` / `types/kci.ts` | model | — | Simple type declaration files; `types/auth.ts` shows the file shape but KRI/KCI types are novel domain types. Follow `types/auth.ts` pattern: export plain TypeScript types, no runtime code. |

---

## Metadata

**Analog search scope:** `lib/strategic/`, `lib/compliance/`, `lib/risk/`, `lib/audit/`, `app/(protected)/strategic/`, `app/(protected)/risk/`, `app/(protected)/audit/`, `app/(protected)/dashboard/`, `app/api/compliance/`, `supabase/migrations/`, `components/layout/`, `components/compliance/`, `types/`
**Files scanned:** 35
**Pattern extraction date:** 2026-05-25
