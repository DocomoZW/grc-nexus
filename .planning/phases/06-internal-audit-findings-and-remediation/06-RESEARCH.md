# Phase 6: Internal Audit - Findings and Remediation - Research

**Researched:** 2026-05-23
**Domain:** Internal audit findings lifecycle, remediation evidence, escalation notifications, institution-scoped RLS, immutable audit trail
**Confidence:** HIGH

---

## Summary

Phase 6 should mirror the proven Risk and Compliance implementation pattern already in this codebase:
- SQL-first migrations with separate schema, RLS, and trigger files
- Server Actions for create/update/status/evidence workflows
- Query helpers for list/detail/dashboard stats
- Escalation service + CRON_SECRET-protected API route
- Protected route group pages with client table/filter components
- Role and institution enforcement in both app-layer checks and database RLS

This phase delivers an internal audit module where audit officers can create findings, assign remediation owners, collect closure evidence, track overdue remediations, and trigger escalation alerts.

---

## Existing Patterns To Reuse

### Security and Auth Context
- `lib/supabase/server.ts` and `supabase.auth.getUser()` are the standard for server-side auth checks.
- JWT app metadata (`institution_id`, `active_role`) is already used in actions.
- App roles already include `audit-officer` in `types/auth.ts`.

### Database and RLS
- Mirror migration split used by compliance:
  - `*_schema.sql`
  - `*_rls.sql`
  - `*_triggers.sql`
- RLS must use:
  - `(select public.institution_id())`
  - `(select public.active_role())`
- Every new table requires `enable row level security` and `force row level security`.
- Every audit-domain table should attach `audit.attach_audit_trigger()`.

### Service Layer
- Mirror structure from:
  - `lib/compliance/actions.ts`
  - `lib/compliance/queries.ts`
  - `lib/compliance/escalation.ts`
- Route-level cron trigger pattern from:
  - `app/api/compliance/escalate/route.ts`

### UI Layer
- Protected route model from `app/(protected)/*`.
- Dashboard stat card pattern from `components/compliance/ComplianceStatCard.tsx`.
- Table/filter pattern from compliance obligations table.

---

## Recommended Data Model For Findings

Use a single `audit_findings` table plus `audit_finding_evidence` table.

### `audit_findings` (core)
- `id uuid pk`
- `institution_id uuid not null`
- `finding_reference text not null unique per institution`
- `title text not null`
- `narrative text not null`
- `root_cause text not null`
- `severity audit_finding_severity enum`
- `status audit_finding_status enum`
- `audit_review_date date not null`
- `due_date date not null`
- `remediation_owner_id uuid nullable`
- `linked_entity_type audit_linked_entity_type enum` (`control` | `risk` | `compliance_obligation`)
- `linked_entity_id uuid not null`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

### `audit_finding_evidence` (closure proof)
- `id uuid pk`
- `institution_id uuid not null`
- `finding_id uuid not null`
- `storage_path text not null`
- `original_filename text not null`
- `mime_type text not null`
- `file_size_bytes bigint not null`
- `sha256_hash text not null`
- `uploaded_by uuid`
- `uploaded_at timestamptz`

### Enums
- `audit_finding_severity`: `minor`, `moderate`, `major`, `critical`
- `audit_finding_status`: `open`, `in_progress`, `closed`
- `audit_linked_entity_type`: `control`, `risk`, `compliance_obligation`

---

## Escalation and Notification Model

Follow compliance escalation design:
- Query open/in-progress findings where `due_date` crosses threshold windows
- Send to remediation owner and audit-officer recipients for same institution
- Protect route with `x-cron-secret`

Thresholds should mirror existing governance patterns:
- Early warning: 3 days before due date
- Due today
- Critical overdue: 7+ days after due date

---

## Constraints and Pitfalls

1. Do not rely only on UI role gates; RLS must be authoritative.
2. Finding reference uniqueness should be institution-scoped.
3. Status transitions must remain valid (`open -> in_progress -> closed`), with no direct invalid transitions.
4. Evidence uploads must keep immutable path + hash verification pattern used by compliance.
5. Migration numbering should continue after `20260522000022_compliance_triggers.sql`.
6. Keep `dynamic = 'force-dynamic'` on protected audit pages to avoid stale or leaked cached data.

---

## Suggested Migration Sequence

- `20260522000023_audit_schema.sql`
- `20260522000024_audit_rls.sql`
- `20260522000025_audit_triggers.sql`

---

## Requirement Mapping Support

- `AUDIT-01`: finding creation linked to control/risk/compliance obligation
- `AUDIT-02`: severity + root cause + remediation owner + immutable fields
- `AUDIT-03`: remediation owner status updates + evidence upload
- `AUDIT-04`: dashboard summary by severity + overdue remediations
- `AUDIT-05`: escalation notifications to owner + audit officer

---

## Canonical References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `types/auth.ts`
- `types/compliance.ts`
- `lib/compliance/actions.ts`
- `lib/compliance/queries.ts`
- `lib/compliance/escalation.ts`
- `app/api/compliance/escalate/route.ts`
- `app/(protected)/compliance/page.tsx`
- `supabase/migrations/20260522000020_compliance_schema.sql`
- `supabase/migrations/20260522000021_compliance_rls.sql`
- `supabase/migrations/20260522000022_compliance_triggers.sql`
