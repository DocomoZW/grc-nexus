---
phase: 04-compliance-management-obligations-and-evidence
reviewed: 2026-05-23T21:30:00Z
depth: standard
iteration: 2
files_reviewed: 30
files_reviewed_list:
  - app/api/compliance/evidence/[id]/route.ts
  - lib/compliance/actions.ts
  - lib/compliance/compliance-utils.ts
  - lib/compliance/queries.ts
  - app/(protected)/compliance/obligations/ObligationsTable.tsx
  - lib/compliance/escalation.ts
  - supabase/migrations/20260522000020_compliance_schema.sql
  - supabase/migrations/20260522000021_compliance_rls.sql
  - supabase/migrations/20260522000022_compliance_triggers.sql
  - types/compliance.ts
  - types/auth.ts
  - lib/schemas/compliance.ts
  - app/api/compliance/escalate/route.ts
  - components/compliance/ComplianceStatCard.tsx
  - components/compliance/ObligationFilterBar.tsx
  - components/compliance/EvidenceFileRow.tsx
  - components/compliance/AttestationRow.tsx
  - app/(protected)/compliance/page.tsx
  - app/(protected)/compliance/obligations/page.tsx
  - app/(protected)/compliance/obligations/new/page.tsx
  - app/(protected)/compliance/obligations/new/ObligationForm.tsx
  - app/(protected)/compliance/obligations/[id]/page.tsx
  - app/(protected)/compliance/obligations/[id]/edit/page.tsx
  - app/(protected)/compliance/obligations/[id]/edit/ObligationEditForm.tsx
  - app/(protected)/compliance/obligations/[id]/attest/page.tsx
  - app/(protected)/compliance/obligations/[id]/attest/AttestationForm.tsx
  - app/(protected)/compliance/obligations/[id]/evidence/upload/page.tsx
  - app/(protected)/compliance/obligations/[id]/evidence/upload/EvidenceUploadForm.tsx
  - app/(protected)/layout.tsx
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: clean
---

# Phase 04: Code Review Report (Iteration 2 — Re-review)

**Reviewed:** 2026-05-23T21:30:00Z
**Depth:** standard
**Files Reviewed:** 30
**Iteration:** 2 of --auto mode
**Status:** clean

## Summary

All critical and high issues from iteration 1 have been correctly resolved. The module now passes review with no critical or warning findings.

**Fixes confirmed:**

- **CR-01 resolved** — `app/api/compliance/evidence/[id]/route.ts:87` now uses RFC 5987 `filename*=UTF-8''${encodedFilename}` encoding, eliminating the HTTP header injection path.
- **HI-01 resolved** — `lib/compliance/actions.ts:18` declares `uuidSchema = z.string().uuid()`, applied at lines 130 and 188–190 before any DB access in `updateObligation` and `uploadEvidence`. `attestObligation` is guarded at line 295.
- **HI-02 resolved** — `lib/compliance/actions.ts:337–342` now returns an explicit error when the status update fails after a successful attestation insert, preventing silent partial-failure success responses.
- **HI-03 resolved** — `lib/compliance/actions.ts:243–248` distinguishes the duplicate-file storage error (`already exists` message or statusCode `23505`) from other storage errors and returns a specific user-readable message.
- **ME-01 resolved** — `lib/compliance/compliance-utils.ts:27–29` compares YYYY-MM-DD date strings, so obligations due today are no longer incorrectly flagged as overdue.
- **ME-02 resolved** — `lib/compliance/queries.ts:137–143` documents the intentional gap in escalation coverage (1–6 days past due receives no alert per D-26 design), with guidance on how to extend it.
- **ME-03 resolved** — `app/(protected)/compliance/obligations/ObligationsTable.tsx:141` sets `enableSorting: false` on the `evidence_count` stub column, with a `FIXME` comment explaining the stub.
- **ME-04 resolved** — `lib/compliance/escalation.ts:13–19` adds `escapeHtml` and applies it to all user-supplied values (`obligation.title`, `obligation.framework`, `obligation.due_date`) embedded in the HTML email body.

Three low/informational items from iteration 1 remain, none of which meet the threshold for Warning severity.

---

## Info

### IN-01: `owner_id` Still Normalised to `'unassigned'` String (carry-over from LO-01)

**File:** `app/(protected)/compliance/obligations/page.tsx:56`
**Issue:** `owner_id: row.owner_id ?? 'unassigned'` coerces null to the string `'unassigned'`. The `ObligationRow` type declares `owner_id: string | null`. The owner filter in `ObligationFilterBar` only shows owners from non-null `owner_id` values, so rows with `'unassigned'` never appear in the filter dropdown and are excluded from any owner-filter match — these rows are invisible to filtering, not just "unfiltered". This is a behavioural inconsistency, not a bug that crashes or corrupts data, but it means a compliance officer cannot filter to "unowned obligations" using the owner dropdown.
**Fix:** Preserve `null` for unassigned owners:
```typescript
owner_id: row.owner_id ?? null,
```
The `owner_name` field already handles the display side: `|| 'Unassigned'` on line 57.

---

### IN-02: Dead Code Branch in `EvidenceFileRow.getFileIcon` (carry-over from LO-02)

**File:** `components/compliance/EvidenceFileRow.tsx:40–43`
**Issue:** The `application/vnd.ms-excel` MIME type branch at line 41 can never be reached. `application/vnd.ms-excel` (the old `.xls` format) is not in the server-side `ALLOWED_MIME_TYPES` list in `lib/compliance/actions.ts` or `lib/schemas/compliance.ts`. The only allowed spreadsheet type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`.xlsx`), which is already handled by the first condition in the `if` at line 40.
**Fix:** Remove the unreachable `vnd.ms-excel` branch:
```typescript
function getFileIcon(mimeType: string) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    return <FileImage className="mt-[2px] h-5 w-5 flex-shrink-0 text-navy-mid" aria-hidden="true" />
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return <FileSpreadsheet className="mt-[2px] h-5 w-5 flex-shrink-0 text-navy-mid" aria-hidden="true" />
  }
  return <FileText className="mt-[2px] h-5 w-5 flex-shrink-0 text-navy-mid" aria-hidden="true" />
}
```

---

### IN-03: `due_date` Schema Accepts Any Non-Empty String (carry-over from IN-03)

**File:** `lib/schemas/compliance.ts:20`
**Issue:** `due_date: z.string().min(1, 'Due date is required.')` accepts any non-empty string. A non-date value will reach Postgres and fail at the column type check, returning `GENERIC_ERROR` to the user instead of a specific validation message. The `<Input type="date">` in both `ObligationForm` and `ObligationEditForm` produces `YYYY-MM-DD` in modern browsers, but this server-side gap matters for API clients or unusual browser environments.
**Fix:**
```typescript
due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format.'),
```

---

## Fixes Status Table

| ID | Issue | Previous Severity | Status |
|----|-------|-------------------|--------|
| CR-01 | HTTP header injection via Content-Disposition filename | CRITICAL | Fixed |
| HI-01 | Missing UUID validation on obligationId params | HIGH | Fixed |
| HI-02 | Silent partial failure in attestObligation | HIGH | Fixed |
| HI-03 | TOCTOU race in evidence collision check | HIGH | Fixed |
| ME-01 | isObligationOverdue fires on due-date day | MEDIUM | Fixed |
| ME-02 | Escalation gap for 1–6 days overdue | MEDIUM | Documented (intentional per D-26) |
| ME-03 | evidence_count stub with sortable column | MEDIUM | Fixed |
| ME-04 | XSS in escalation email HTML | MEDIUM | Fixed |
| LO-01 | owner_id coerced to 'unassigned' string | LOW | Remains (IN-01 above) |
| LO-02 | Dead code in EvidenceFileRow MIME mapping | LOW | Remains (IN-02 above) |
| LO-03 | FrameworkBadge duplicated 5× | LOW | Remains (accepted, not blocking) |
| IN-01 | Latent checksum non-hex path | INFO | Not reviewed (out of scope file) |
| IN-02 | due-today ambiguity in stats | INFO | Documented behaviour |
| IN-03 | due_date no date format validation | INFO | Remains (IN-03 above) |
| IN-04 | active_role vs user_roles for escalation | INFO | Not changed (accepted risk) |

---

_Reviewed: 2026-05-23T21:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 2_
