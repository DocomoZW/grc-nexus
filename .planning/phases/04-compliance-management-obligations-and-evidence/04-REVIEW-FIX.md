---
phase: 04-compliance-management-obligations-and-evidence
fixed_at: 2026-05-23T21:00:00Z
review_path: .planning/phases/04-compliance-management-obligations-and-evidence/04-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-05-23T21:00:00Z
**Source review:** `.planning/phases/04-compliance-management-obligations-and-evidence/04-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 8
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: HTTP Header Injection via Unsanitised `original_filename` in Content-Disposition

**Files modified:** `app/api/compliance/evidence/[id]/route.ts`
**Commit:** fd74a24
**Applied fix:** Replaced `filename="${evidence.original_filename}"` with RFC 5987 percent-encoding: `filename*=UTF-8''${encodeURIComponent(evidence.original_filename)}`. Added explanatory comment referencing CR-01. This eliminates the injection vector by percent-encoding all characters that could break or split the header (double-quotes, backslashes, CRLF sequences).

---

### HI-01: `obligationId` Parameters in Server Actions Are Not Validated as UUIDs

**Files modified:** `lib/compliance/actions.ts`
**Commit:** 3126661
**Applied fix:** Added `import { z } from 'zod'` and a module-level `const uuidSchema = z.string().uuid()`. Added a `uuidSchema.safeParse(obligationId).success` guard as the first check in `updateObligation`, `attestObligation`, and at the top of the validation block in `uploadEvidence` (after the null check for `obligationId` from `FormData`). Each guard returns `{ error: 'Invalid obligation ID.' }` on failure.

---

### HI-02: Partial Failure in `attestObligation` — Status Update Silently Skipped on Error

**Files modified:** `lib/compliance/actions.ts`
**Commit:** fa67663
**Applied fix:** Changed the `updateError` handler in `attestObligation` from a silent log-and-continue to a `return { error: 'Attestation recorded but status update failed. Please refresh and verify.' }`. The attestation row insert (append-only audit trail) is unaffected; the caller now receives a clear error when the denormalised status column update fails, preventing the UI from silently showing stale status.

---

### HI-03: Timing Gap in Evidence Collision Check — TOCTOU Race Condition

**Files modified:** `lib/compliance/actions.ts`
**Commit:** 2723ab4
**Applied fix:** Added duplicate-detection logic in the `uploadError` handler block. Before falling through to the generic error message, the code now checks whether the Supabase Storage error message contains `'already exists'` (case-insensitive) or the statusCode is `'23505'`. If either condition is true, it returns the user-friendly `'Evidence file already exists; upload a new version.'` message instead of the generic connection error, correctly handling the TOCTOU race scenario.

---

### ME-01: `isObligationOverdue` Uses `isPast` Which Counts Any Time Today as "Past"

**Files modified:** `lib/compliance/compliance-utils.ts`
**Commit:** 7d35f75
**Applied fix:** Replaced the `isPast(new Date(dueDate))` call with a YYYY-MM-DD string comparison: extracts `today` as `new Date().toISOString().slice(0, 10)` and `due` from the dueDate argument (handling both string and Date inputs), then returns `due < today` (strict less-than). An obligation due today returns `false` (not overdue) until the calendar day has passed. Also removed the now-unused `isPast` import from `date-fns`. Added a JSDoc comment explaining the rationale.

**Status:** fixed: requires human verification (logic change — reviewer should confirm the `due < today` string comparison behaves correctly across all timezone scenarios in the deployment environment)

---

### ME-02: `getObligationsForEscalation` May Return Obligations More Than 3 Days Past Due That Are Not in the `critical_overdue` Bucket

**Files modified:** `lib/compliance/queries.ts`
**Commit:** 8ffc6e5
**Applied fix:** Added a detailed block comment in `getObligationsForEscalation` documenting the intentional gap per D-26: obligations 1–6 days past due are fetched but skipped by escalation.ts because no threshold bucket covers this window. The comment names the gap explicitly (ME-02), references D-26 as the design authority, and provides guidance on how to extend coverage (add an `'overdue'` bucket to `getEscalationThreshold` for diff values `[-6, -1]`).

---

### ME-03: Sortable Evidence Count Column with All-Zero Values

**Files modified:** `app/(protected)/compliance/obligations/ObligationsTable.tsx`
**Commit:** 96199c4
**Applied fix:** Changed `enableSorting: true` to `enableSorting: false` on the `evidence_count` column accessor. Added a FIXME comment explaining that all values are `0` until `listObligations` includes a count join. This removes the misleading sort affordance on the stub column.

---

### ME-04: Stored XSS in Escalation Email HTML — Unsanitised `obligation.title`

**Files modified:** `lib/compliance/escalation.ts`
**Commit:** 2854747
**Applied fix:** Added an `escapeHtml(str: string): string` helper function at the top of the module that escapes `&`, `<`, `>`, and `"` to their HTML entities. Applied `escapeHtml()` to all four user-supplied values interpolated into the email HTML body: `obligation.title`, `obligation.framework.toUpperCase()`, `obligation.due_date`, and `threshold.replace(/_/g, ' ')`. The email subject lines still use raw values (email subjects are plain text, not HTML rendered).

---

_Fixed: 2026-05-23T21:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
