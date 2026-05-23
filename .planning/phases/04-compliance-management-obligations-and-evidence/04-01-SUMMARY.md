---
phase: 04-compliance-management-obligations-and-evidence
plan: 01
subsystem: compliance-foundation
tags: [database, migrations, rls, types, zod, utilities, supabase-storage]
dependency_graph:
  requires:
    - 01-01  # Foundation auth schema and app_role enum
    - 03-01  # Risk schema pattern (migration conventions)
  provides:
    - compliance_obligations table with RLS
    - obligation_evidence table with RLS
    - obligation_attestations table with RLS (append-only)
    - compliance-evidence private Storage bucket with RLS
    - audit triggers on all three compliance tables
    - TypeScript types: RegulatoryFramework, ObligationStatus, AttestationStatus, ObligationRow
    - AppRole updated with compliance-officer
    - Zod v3 schemas: obligationSchema, attestationSchema, evidenceUploadSchema
    - Pure utilities: OBLIGATION_STATUS_BADGE, isObligationOverdue, getEscalationThreshold, buildStoragePath, computeCompliancePercentage
  affects:
    - types/auth.ts  # AppRole extended with compliance-officer
    - app/(protected)/dashboard/page.tsx  # ROLE_LABELS + ROLE_BADGE_COLORS updated
    - app/(protected)/role-select/RoleSelectForm.tsx  # ROLE_BADGE_COLORS + ROLE_LABELS updated
tech_stack:
  added: []
  patterns:
    - Phase 3 migration mirror (schema → rls → triggers)
    - Postgres RLS with institution_id scoping and active_role role checks
    - Supabase Storage private bucket with JWT app_metadata path-prefix RLS
    - Zod v3 refine() for cross-field validation (framework = other → framework_reference required)
    - Pure utility functions with date-fns (no framework side effects)
key_files:
  created:
    - supabase/migrations/20260522000020_compliance_schema.sql
    - supabase/migrations/20260522000021_compliance_rls.sql
    - supabase/migrations/20260522000022_compliance_triggers.sql
    - types/compliance.ts
    - lib/schemas/compliance.ts
    - lib/compliance/compliance-utils.ts
    - .env.local.example
  modified:
    - types/auth.ts
    - app/(protected)/dashboard/page.tsx
    - app/(protected)/role-select/RoleSelectForm.tsx
decisions:
  - "Role string confirmed as 'compliance-officer' (hyphen) — matches app_role enum convention in 20260522000001_base_schema.sql"
  - "JWT institution_id claim path confirmed as auth.jwt() -> 'app_metadata' ->> 'institution_id' — from 20260522000005_custom_access_token_hook.sql"
  - "Storage RLS uses (storage.foldername(name))[1] for path prefix matching — Supabase docs pattern"
  - "obligation_attestations is append-only — no UPDATE or DELETE RLS policies"
  - "attested_at uses NOT NULL DEFAULT now() — never accepted from client (D-18)"
  - "evidenceUploadSchema uses inline z.enum() array — readonly tuple cast caused TS2352 error"
metrics:
  duration: ~20 minutes
  completed: "2026-05-23"
  tasks_completed: 3
  files_created: 7
  files_modified: 3
---

# Phase 04 Plan 01: Compliance Foundation — Schema, Types, and Utilities Summary

Three Postgres migrations, TypeScript types, Zod v3 validation schemas, and pure utility functions for Phase 4 Compliance Management — all applied to the remote Supabase database via `supabase db push`.

## What Was Built

### Task 1: Database Migrations (committed `186238c`)

Three migration files created and pushed to Supabase:

**`20260522000020_compliance_schema.sql`**
- Three Postgres enums: `regulatory_framework`, `obligation_status`, `attestation_status`
- Three tables: `compliance_obligations`, `obligation_evidence`, `obligation_attestations`
- Indexes on institution_id, framework, owner_id, status, due_date
- `obligation_attestations` is append-only (no `updated_at` column; `attested_at` is `NOT NULL DEFAULT now()`)
- Private Supabase Storage bucket `compliance-evidence` created via `insert into storage.buckets`

**`20260522000021_compliance_rls.sql`**
- RLS enabled and forced on all three tables
- `compliance_obligations`: SELECT = all authenticated (institution-scoped); INSERT/UPDATE = admin + compliance-officer
- `obligation_evidence`: SELECT = admin, ceo, compliance-officer, risk-officer, audit-officer, board-member (institution-scoped); INSERT = admin + compliance-officer; no UPDATE or DELETE
- `obligation_attestations`: SELECT = all authenticated (institution-scoped); INSERT = admin, ceo, compliance-officer; no UPDATE or DELETE (append-only enforced by omission)
- Storage RLS: SELECT + INSERT scoped to `(storage.foldername(name))[1] = JWT app_metadata institution_id`; INSERT also checks active_role in (admin, compliance-officer)

**`20260522000022_compliance_triggers.sql`**
- `audit.attach_audit_trigger()` for all three compliance tables

### Task 2: TypeScript Types, Zod Schemas, Utilities (committed `9f70b8e`)

**`types/compliance.ts`** — new file
- `RegulatoryFramework`, `ObligationStatus`, `AttestationStatus` union types
- `REGULATORY_FRAMEWORK_LABELS`, `OBLIGATION_STATUS_LABELS`, `ATTESTATION_STATUS_LABELS` record maps
- `ObligationRow` interface for TanStack Table consumption

**`types/auth.ts`** — modified
- Added `'compliance-officer'` (hyphen convention) to `AppRole` union
- Added entry in `ROLE_DESCRIPTIONS` record

**`lib/schemas/compliance.ts`** — new file (Zod v3 only)
- `obligationSchema` with `.refine()` for framework=other → framework_reference required
- `attestationSchema` with custom errorMap
- `evidenceUploadSchema` with SHA-256 regex, MIME allowlist, 25MB size limit
- Exported inferred types: `ObligationInput`, `AttestationInput`, `EvidenceUploadInput`

**`lib/compliance/compliance-utils.ts`** — new file (pure functions only)
- `OBLIGATION_STATUS_BADGE` — Tailwind CSS classes per status
- `isObligationOverdue(status, dueDate)` — returns true only for non-terminal statuses past due date
- `getEscalationThreshold(dueDate)` — returns 'early_warning' | 'due_today' | 'critical_overdue' | null
- `buildStoragePath(institutionId, obligationId, epoch, sha256Hash, ext)` — deterministic immutable storage path (D-10)
- `computeCompliancePercentage(obligations)` — % compliant excluding waived from denominator

**`.env.local.example`** — new file
- Documents `CRON_SECRET` environment variable required for escalation route

### Task 3: Supabase DB Push

`supabase db push` applied all three migrations without error. `supabase migration list` confirms all three (`20260522000020`, `20260522000021`, `20260522000022`) show as applied on both Local and Remote.

Note: `supabase db diff --linked` requires Docker (not available on this machine). Confirmed via `supabase migration list` that all migrations are in sync.

---

## Key Decisions Confirmed During Execution

| Decision | Source | Value |
|----------|--------|-------|
| Role string convention | `20260522000001_base_schema.sql` app_role enum | `'compliance-officer'` (hyphen — matches existing `risk-officer`, `audit-officer`, `board-member`, `dept-head`) |
| JWT institution_id claim path | `20260522000005_custom_access_token_hook.sql` | `auth.jwt() -> 'app_metadata' ->> 'institution_id'` (nested under app_metadata, not flat JWT) |
| Migration numbering | disk state verification | Starts at 20260522000020 (20260522000016–19 already taken) |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript exhaustive check errors after adding compliance-officer to AppRole**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Adding `'compliance-officer'` to `AppRole` union caused TS2741 errors in `dashboard/page.tsx` and `RoleSelectForm.tsx` because their `Record<AppRole, string>` maps did not include the new role
- **Fix:** Added `'compliance-officer'` entry to `ROLE_LABELS` and `ROLE_BADGE_COLORS` in both files (teal-700 color token chosen to match compliance domain)
- **Files modified:** `app/(protected)/dashboard/page.tsx`, `app/(protected)/role-select/RoleSelectForm.tsx`
- **Commit:** `9f70b8e`

**2. [Rule 1 - Bug] Fixed Zod v3 readonly tuple cast error in evidenceUploadSchema**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `z.enum(ALLOWED_MIME_TYPES as [string, ...string[]])` caused TS2352 — readonly tuple cannot be cast to mutable tuple via `as`
- **Fix:** Inlined the MIME type array as a literal array directly in `z.enum([...])` — Zod v3 accepts literal tuple syntax without a cast
- **Files modified:** `lib/schemas/compliance.ts`
- **Commit:** `9f70b8e`

**3. [Rule 3 - Blocking issue] .env.local.example caught by .gitignore**
- **Found during:** Task 2 commit
- **Issue:** `.gitignore` has `.env.*` rule which catches `.env.local.example`; the file could not be committed normally
- **Fix:** Used `git add -f` to force-add the file (`.env.example` is whitelisted, `.env.local.example` is not — plan specified `.env.local.example` explicitly)
- **Files modified:** `.env.local.example` (force-added)
- **Commit:** `9f70b8e`

**4. [Note] supabase db diff --linked unavailable (Docker not installed)**
- **Issue:** `supabase db diff --linked` requires Docker Desktop which is not installed
- **Resolution:** Confirmed migrations are applied via `supabase migration list` — all three show matching Local/Remote timestamps. Push succeeded without errors.
- **Impact:** None — migration list output provides equivalent confirmation

---

## Known Stubs

None. This plan delivers pure infrastructure (migrations + types + utilities). No UI components, no data wiring, no stubs.

---

## Threat Surface Scan

No new network endpoints introduced in this plan. Threat model mitigations from T-4-01-S through T-4-01-E are all implemented as specified in the plan's threat register:

| Flag | File | Mitigation Implemented |
|------|------|----------------------|
| T-4-01-S | compliance_obligations RLS | `with check ((select public.active_role()) in ('admin', 'compliance-officer'))` |
| T-4-01-T | obligation_attestations RLS | No UPDATE or DELETE policy — append-only enforced by omission |
| T-4-01-R | obligation_attestations.attested_at | `NOT NULL DEFAULT now()` — DB-generated; not in insert payload |
| T-4-01-I | All three tables | `using (institution_id = (select public.institution_id()))` |
| T-4-01-I2 | storage.objects | Private bucket + Storage RLS with JWT app_metadata path prefix |
| T-4-01-E | compliance-officer role | Hyphen convention confirmed against DB enum; consistent with all prior roles |

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `supabase/migrations/20260522000020_compliance_schema.sql` | FOUND |
| `supabase/migrations/20260522000021_compliance_rls.sql` | FOUND |
| `supabase/migrations/20260522000022_compliance_triggers.sql` | FOUND |
| `types/compliance.ts` | FOUND |
| `lib/schemas/compliance.ts` | FOUND |
| `lib/compliance/compliance-utils.ts` | FOUND |
| `.env.local.example` | FOUND |
| commit `186238c` (migrations) | FOUND |
| commit `9f70b8e` (types+schemas) | FOUND |
