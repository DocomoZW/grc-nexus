# Phase 14: Advanced Analytics — Forecasting, Anomaly Detection, and Data Export - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 adds analytics intelligence to the GRC-Nexus platform without requiring an external Python/R runtime. Three capabilities are delivered: (1) predictive KPI/KRI forecast bands rendered on detail pages using linear regression over historical readings; (2) a background daily cron job that detects metric readings deviating more than 2 standard deviations from the trailing 6-period mean, inserts notifications, and sends Resend alert emails to metric owners and admins; (3) an admin-only Analytics Export page at `/admin/analytics-export` that provides per-module CSV downloads and inline API documentation for each module's data schema.

</domain>

<decisions>
## Implementation Decisions

### Forecast Visualization
- Separate `ForecastChart` client component — keeps existing KPI/KRI detail pages clean and isolates Recharts client boundary
- Full detail chart (200px with x-axis labels) on detail pages — readable forecast band visible alongside historical trend
- `ReferenceArea` shaded band for forecast range (high/low linear regression bounds) — visually clear uncertainty range
- 4 readings minimum before showing forecast (per spec); hide forecast section entirely if insufficient data (no empty state noise)

### Anomaly Detection Architecture
- Vercel Cron via `vercel.json` + POST route at `/api/analytics/anomaly-detect` — matches existing cron pattern from `auto-findings` route
- Notify metric owner + all institution admins — ensures governance visibility even if owner is unavailable
- New `AnomalyAlertEmail` React Email template following existing Resend pattern (`noreply@grcnexus.gov.zw`) — polished, consistent with role notification emails
- Threshold hardcoded at 2 standard deviations from trailing 6-period mean (per spec) — no UI complexity needed

### Analytics Export Admin Page
- Page at `/admin/analytics-export` — grouped with existing admin tools, no new top-level nav section
- Per-module download button layout in a table — one row per module, mirrors existing audit export UX
- Accordion section below download buttons for API documentation — no extra routing, keeps everything on one page
- Admin-only role guard — consistent with existing `/api/audit/export` role restriction pattern

### Linear Regression Algorithm
- Period index encoding (0, 1, 2...) for x-axis — simpler math, avoids date parsing edge cases across KPI frequencies
- 2 forecast periods ahead (per spec) — forecast points at index n+1 and n+2 beyond last reading
- Pure TS utility at `lib/analytics/forecast.ts` — testable, reusable for both KPI and KRI detail pages
- Hide forecast section entirely when fewer than 4 readings exist — no "insufficient data" message clutter

### Claude's Discretion
- Specific CSV column names and ordering per module
- Exact Recharts chart margins and axis label formatting on ForecastChart
- React Email template design/layout for AnomalyAlertEmail
- Which Supabase tables to query for each module export (use RLS-respecting user client for exports)
- Error handling and retry logic within the cron route

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/(protected)/strategic/KpiSparkline.tsx` — Recharts LineChart + ResponsiveContainer sparkline; pattern for ForecastChart (uses same libs, same `isAnimationActive={false}` pattern)
- `components/indicators/IndicatorSparkline.tsx` — KRI sparkline counterpart; same Recharts pattern
- `app/api/audit/export/route.ts` — Complete CSV export template: GET route, auth check, admin/audit-officer role gate, Supabase query, CSV header+rows build, `text/csv` Response with `Content-Disposition`
- `app/api/audit/auto-findings/route.ts` — Complete cron route template: POST with `x-cron-secret` header auth, `createClient` admin Supabase client using `SUPABASE_SERVICE_ROLE_KEY`
- `lib/notifications/insert.ts` — `insertNotification()` helper using admin client; accepts `institutionId`, `userId`, `title`, `body`, `link`, `sourceModule`
- `lib/email/send-role-notification.ts` — Resend email pattern: env key guard, `new Resend(key)`, `resend.emails.send()` with `react: createElement(Template, props)`
- `types/notifications.ts` — `SourceModule` union type; will need `'analytics'` or use `'system'` for anomaly alerts

### Established Patterns
- All detail pages export `export const dynamic = 'force-dynamic'` (prevent ISR caching)
- Cron routes: POST only, verify `x-cron-secret` header against `process.env.CRON_SECRET`, use `createAdminClient` (service role)
- CSV export routes: GET, authenticated via `supabase.auth.getUser()`, role check on `user.app_metadata.active_role`, build plain CSV string, return `new Response(csv, { headers: { 'Content-Type': 'text/csv' } })`
- Email sender address: `'GRC-Nexus <noreply@grcnexus.gov.zw>'`
- Admin client import: `createClient as createAdminClient from '@supabase/supabase-js'` with `SUPABASE_SERVICE_ROLE_KEY`
- `vercel.json` does not yet exist — needs to be created for cron schedule

### Integration Points
- KPI detail page: `app/(protected)/strategic/kpis/[id]/page.tsx` — add `ForecastChart` component after readings history section
- KRI detail page: `app/(protected)/risk/kris/[id]/page.tsx` — add `ForecastChart` component after readings section
- Admin nav: `app/(protected)/admin/` — add "Analytics Export" link to admin sidebar
- New API routes: `app/api/analytics/anomaly-detect/route.ts` (cron POST), `app/api/analytics/export/[module]/route.ts` (per-module CSV GET)
- `vercel.json` at project root — define daily cron for anomaly detection
- `lib/analytics/forecast.ts` — new pure TS utility for linear regression

</code_context>

<specifics>
## Specific Ideas

- The forecast should render as a Recharts `ComposedChart` (or `LineChart` with `ReferenceArea`) on the detail pages — not replace the existing sparkline but appear below/after the readings history table as a dedicated analytics section
- For the anomaly cron: query `kpi_readings` and `kri_readings` tables, group by `kpi_id`/`kri_id`, compute mean and std dev of last 6 readings per metric, flag any latest reading that deviates > 2σ
- The `lib/analytics/forecast.ts` utility should export: `linearRegression(data: number[]): { slope: number; intercept: number }` and `forecastPoints(readings: number[], horizon: number): { lower: number; upper: number }[]`
- CSV exports should be institution-scoped using the authenticated user's RLS context (user client, not admin client) for module exports — this ensures data isolation per institution
- The Analytics Export page should list all 9 modules per spec: risks, KPIs, KRIs, KCIs, obligations, findings, incidents, board actions, ESG metrics

</specifics>

<deferred>
## Deferred Ideas

- Configurable anomaly threshold per metric (extra DB column + UI — out of spec for this phase)
- Forecasting for other modules beyond KPI/KRI (e.g., compliance obligation trends)
- Webhook push of anomaly alerts to Slack/Teams
- Historical anomaly log page in admin
- Aggregate/cross-institution analytics (multi-tenant — deferred to post-prototype)

</deferred>
