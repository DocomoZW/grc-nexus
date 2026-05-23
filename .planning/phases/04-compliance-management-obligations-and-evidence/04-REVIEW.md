---
phase: 04-compliance-management-obligations-and-evidence
reviewed: 2026-05-23T20:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - supabase/migrations/20260522000020_compliance_schema.sql
  - supabase/migrations/20260522000021_compliance_rls.sql
  - supabase/migrations/20260522000022_compliance_triggers.sql
  - types/compliance.ts
  - types/auth.ts
  - lib/schemas/compliance.ts
  - lib/compliance/compliance-utils.ts
  - lib/compliance/actions.ts
  - lib/compliance/queries.ts
  - lib/compliance/escalation.ts
  - app/api/compliance/escalate/route.ts
  - app/api/compliance/evidence/[id]/route.ts
  - components/compliance/ComplianceStatCard.tsx
  - components/compliance/ObligationFilterBar.tsx
  - components/compliance/EvidenceFileRow.tsx
  - components/compliance/AttestationRow.tsx
  - app/(protected)/compliance/page.tsx
  - app/(protected)/compliance/obligations/page.tsx
  - app/(protected)/compliance/obligations/ObligationsTable.tsx
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
  critical: 1
  high: 3
  medium: 4
  low: 3
  info: 4
  total: 15
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-23T20:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Phase 4 delivers the full Compliance Management module: obligations CRUD, evidence upload with SHA-256 integrity, append-only attestation, escalation emails, and a compliance posture dashboard. The overall security posture is strong — RLS policies are correctly scoped to `institution_id`, the `attested_at` column is never accepted from the client, timing-safe comparison is used for checksum verification, and CRON_SECRET is checked before any database work.

The following issues were found during review, ranging from one critical HTTP header injection risk to several medium-priority logic gaps and a handful of code quality items.

---

## CRITICAL Issues

### CR-01: HTTP Header Injection via Unsanitised `original_filename` in Content-Disposition

**File:** `app/api/compliance/evidence/[id]/route.ts:84`
**Issue:** The `original_filename` value retrieved from the database is interpolated directly into the `Content-Disposition` response header without sanitisation:

```typescript
'Content-Disposition': `attachment; filename="${evidence.original_filename}"`,
```

If `original_filename` contains a double-quote (`"`), backslash, or CRLF sequence, an attacker who controls file upload could inject arbitrary HTTP response headers or split the response. Although the `original_filename` originates from `file.name` in the upload Server Action, the header consumer (the browser) evaluates the raw bytes — a filename such as `report".exe` or `a\r\nX-Injected: evil` would produce a malformed or split response header.

**Recommendation:** Sanitise the filename before embedding it in the header. The safest approach is to percent-encode the filename per RFC 6266:

```typescript
// Replace double-quotes and strip control characters from the filename
const safeFilename = evidence.original_filename
  .replace(/[^\x20-\x7E]/g, '')   // strip non-ASCII / control chars
  .replace(/"/g, '\\"')            // escape remaining double-quotes

return new Response(bytes, {
  headers: {
    'Content-Type': evidence.mime_type,
    'Content-Disposition': `attachment; filename="${safeFilename}"`,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
})
```

Or prefer the RFC 5987 `filename*` encoding which avoids embedding raw names in quoted-strings entirely:

```typescript
const encodedFilename = encodeURIComponent(evidence.original_filename)
'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`
```

---

## HIGH Issues

### HI-01: `obligationId` Parameters in Server Actions Are Not Validated as UUIDs

**File:** `lib/compliance/actions.ts:123,271`
**Issue:** `updateObligation(obligationId, values)` and `attestObligation(obligationId, values)` accept `obligationId: string` directly from client-supplied params without UUID format validation. While Supabase RLS prevents cross-institution access, a caller can supply a crafted non-UUID string (e.g. `../../`, SQL metacharacters) that reaches the query layer. Although parameterised queries prevent SQL injection at the Supabase client level, an invalid UUID will produce a Postgres error that is swallowed into `GENERIC_ERROR`, making debugging opaque. More importantly, the `uploadEvidence` action also reads `obligation_id` directly from `FormData` (line 175) with only a null check — no UUID format validation is performed before the value is stored in the database.

**Recommendation:** Validate UUID format at the top of each action before processing:

```typescript
import { z } from 'zod'
const uuidSchema = z.string().uuid()

export async function updateObligation(obligationId: string, values: ObligationInput) {
  if (!uuidSchema.safeParse(obligationId).success) {
    return { error: 'Invalid obligation ID.' }
  }
  // ... rest of function
}
```

Apply the same guard in `attestObligation` and for `obligationId` extracted from `FormData` in `uploadEvidence`.

---

### HI-02: Partial Failure in `attestObligation` — Status Update Silently Skipped on Error

**File:** `lib/compliance/actions.ts:303-315`
**Issue:** After inserting the attestation row (append-only, correct), the action updates `compliance_obligations.status`. If this update fails (`updateError` is non-null), the error is logged but the action still returns `{ data: { id: ... } }` as a success (line 319). This means the UI will receive a success response, show a success toast, and redirect — but the obligation's status column will not reflect the new attestation. The attestation record itself is correct, but the displayed status on the dashboard and obligations table will be stale/wrong, potentially showing "Pending" when an attestation of "Compliant" was just submitted.

```typescript
if (updateError) {
  console.error('[attestObligation] Status update error:', updateError)
  // Non-fatal for audit trail — attestation row already inserted
}
// ← Falls through to return { data: { id: ... } } — caller sees "success"
```

**Recommendation:** Either return an error to the caller so the user knows the status update failed and can retry, or at minimum add a `revalidatePath` specifically before returning to ensure the next page load re-fetches fresh data. If the design decision is "attestation row is the source of truth and status is a denormalisation", document that the UI must re-derive status from attestation history — but currently it does not. The safest fix for the user experience is to surface the partial failure:

```typescript
if (updateError) {
  console.error('[attestObligation] Status update error:', updateError)
  return { error: 'Attestation recorded but status update failed. Please refresh and verify.' }
}
```

---

### HI-03: Timing Gap in Evidence Collision Check — TOCTOU Race Condition

**File:** `lib/compliance/actions.ts:209-225`
**Issue:** The overwrite prevention logic uses a check-then-act pattern: (1) list the storage path to see if a file exists, (2) upload with `upsert: false`. Between the `list()` call and the `upload()` call there is a small but non-zero window where a concurrent upload of the same file could succeed — both requests would see an empty `list()` result and then attempt to `upload()`. The `upsert: false` on Supabase Storage is documented as the authoritative guard, but when both requests race through the list check simultaneously, the second upload will fail with a storage error that is mapped to a generic "Unable to upload evidence" message rather than the more informative "Evidence file already exists" error.

This is inherently difficult to prevent in a stateless server-action architecture, but the current behaviour means the user sees a confusing generic error when a legitimate race occurs. The storage `upsert: false` does correctly prevent actual file overwrite, so there is no data integrity risk — only a UX degradation.

**Recommendation:** Distinguish the storage duplicate error from other storage errors. Supabase Storage returns a specific error code (`"23505"` or `"Duplicate"`) for `upsert: false` conflicts:

```typescript
const { error: uploadError } = await context.supabase.storage
  .from('compliance-evidence')
  .upload(storagePath, file, { upsert: false })

if (uploadError) {
  // Supabase Storage returns "The resource already exists" or statusCode 409/23505
  if (uploadError.message?.includes('already exists') || uploadError.statusCode === '23505') {
    return { error: 'Evidence file already exists; upload a new version.' }
  }
  console.error('[uploadEvidence] Storage upload error:', uploadError)
  return { error: 'Unable to upload evidence. Check your connection and try again.' }
}
```

---

## MEDIUM Issues

### ME-01: `isObligationOverdue` Uses `isPast` Which Counts Any Time Today as "Past"

**File:** `lib/compliance/compliance-utils.ts:23`
**Issue:** `isPast(new Date(dueDate))` returns `true` the moment the `due_date` day begins (i.e., midnight local time), because `new Date('2026-06-01')` parses as `2026-06-01T00:00:00` in local time. An obligation with a `due_date` of today will be flagged as overdue as soon as the user's browser day starts — even though the obligation is "due today" not "overdue". This creates a confusing UX where an obligation shows as overdue in red on the very day it is due.

This affects the table row styling (`border-l-err bg-err/5`) and the due date colour on the detail page.

**Recommendation:** Compare date strings (not timestamps) to check if the due date has passed:

```typescript
export function isObligationOverdue(status: ObligationStatus, dueDate: string | Date): boolean {
  if (status === 'compliant' || status === 'waived' || status === 'overdue') return false
  const today = new Date().toISOString().slice(0, 10)           // 'YYYY-MM-DD'
  const due = typeof dueDate === 'string' ? dueDate.slice(0, 10) : dueDate.toISOString().slice(0, 10)
  return due < today   // strictly in the past, not today
}
```

---

### ME-02: `getObligationsForEscalation` May Return Obligations More Than 3 Days Past Due That Are Not in the `critical_overdue` Bucket

**File:** `lib/compliance/queries.ts:132-145`
**Issue:** The query fetches all obligations with `due_date <= threeDaysOut` (including obligations that are 4, 5, or 6 days past due). `escalation.ts` then calls `getEscalationThreshold()` per obligation and skips those that return `null`. The threshold function returns `null` for obligations that are 1–6 days overdue (not yet at the 7-day critical threshold). This means obligations that are 1–6 days past due are fetched from the database but then unconditionally skipped — they receive no escalation email. This creates a gap: an obligation that is 4 days overdue will not receive any escalation alert.

The original design (D-26) specifies three thresholds: early_warning (1-3 days before), due_today (0 days), and critical_overdue (7+ days). The 1–6 days overdue window is intentionally unaddressed per D-26, but a compliance officer using the system would expect a growing-urgency alert pattern, not silence for the first 6 days after due date.

**Recommendation:** This may be intentional per D-26, but it should be documented clearly. If the intent is to alert at every day overdue until 7 days, update `getEscalationThreshold` to return `'overdue'` for days 1–6 and add that to the subject map. If the 3-bucket design is final, add a comment in `getObligationsForEscalation` explaining why the 1–6 day window receives no alert:

```typescript
// Fetch obligations due within 3 days + all past-due obligations
// Escalation thresholds (D-26): early_warning (1-3 days before), due_today, critical_overdue (7+ days past)
// Note: obligations 1-6 days past due are fetched but skipped by escalation.ts
// (no escalation bucket covers this window per D-26 — adjust getEscalationThreshold if needed)
```

---

### ME-03: `evidence_count` Stub in Obligations List — Filter/Sort on Evidence Column Is Misleading

**File:** `app/(protected)/compliance/obligations/page.tsx:60`
**Issue:** `evidence_count` is hardcoded to `0` for every row (known stub from plan 04-04). The `ObligationsTable` renders this column with `enableSorting: true`, meaning users can click the column header to sort by evidence count — but since every row is `0`, sorting has no effect and the column displays `0` for all rows. A user relying on this column to find obligations without evidence will see all obligations appear to have none.

**Recommendation:** Either remove the Evidence column from the `ObligationsTable` until the count query is implemented, or add a `FIXME` comment and hide the sort affordance:

```typescript
// In ObligationsTable.tsx, for the evidence_count column:
column.accessor('evidence_count', {
  header: 'Evidence',
  cell: (info) => ( /* ... */ ),
  enableSorting: false,  // stub — all values are 0 until listObligations includes count join
})
```

Also add a UI note or tooltip on the column header: "Evidence count available on obligation detail view."

---

### ME-04: Escalation Email HTML Contains Unsanitised `obligation.title` — Potential XSS in Email Client

**File:** `lib/compliance/escalation.ts:83-90`
**Issue:** The escalation email HTML is built via template literal interpolation, and `obligation.title` is inserted unescaped:

```typescript
html: `
  <p><strong>Obligation:</strong> ${obligation.title}</p>
  <p><strong>Framework:</strong> ${obligation.framework.toUpperCase()}</p>
```

If a compliance officer creates an obligation with a title containing HTML tags (e.g., `<script>alert(1)</script>` or `<img src=x onerror=...>`), those tags will be sent verbatim in the email HTML body. While many email clients strip `<script>` tags, some render `<img onerror>` or CSS injection. This is a stored XSS vector in email: a malicious obligation title could trigger JavaScript execution in a recipient's email client.

**Recommendation:** HTML-escape all user-supplied values before embedding them in email HTML:

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// In sendComplianceEscalationEmails:
html: `
  <p><strong>Obligation:</strong> ${escapeHtml(obligation.title)}</p>
  <p><strong>Framework:</strong> ${escapeHtml(obligation.framework.toUpperCase())}</p>
  <p><strong>Due Date:</strong> ${escapeHtml(obligation.due_date)}</p>
`,
```

Alternatively, use a templating library like `@react-email/components` or `mustache` that escapes by default.

---

## LOW Issues

### LO-01: `owner_id` Set to `'unassigned'` String Instead of `null` in Obligations List

**File:** `app/(protected)/compliance/obligations/page.tsx:56`
**Issue:** When normalising rows for the `ObligationsTable`, `owner_id` is defaulted to the string `'unassigned'` when the DB value is `null`:

```typescript
owner_id: row.owner_id ?? 'unassigned',
```

The `ObligationRow` type declares `owner_id: string | null`, and the TanStack Table `filterFn` for the owner column compares `row.getValue(id) === value`. A filter for "Unassigned" owner would need to match the string `'unassigned'`, but the `ObligationFilterBar` owner dropdown is built from `owners` map entries that come from non-null `owner_id` values — unassigned rows would never appear in the dropdown at all. The mismatch is harmless for filtering (unassigned rows just won't match any filter) but represents an inconsistency: the owner_id field on the `ObligationRow` type should be `string | null`, and the normalisation should preserve `null`.

**Recommendation:** Preserve `null` for unassigned owner_id:

```typescript
owner_id: row.owner_id ?? null,
```

The `owner_name` field already handles the display side with `|| 'Unassigned'`.

---

### LO-02: `EvidenceFileRow` Icon Mapping Checks for `application/vnd.ms-excel` (Old XLS) but Not `application/msword` (Old DOC)

**File:** `components/compliance/EvidenceFileRow.tsx:39-43`
**Issue:** The MIME type to icon mapping checks for `application/vnd.ms-excel` and returns the spreadsheet icon, but `application/msword` (the old `.doc` MIME type) is in the allowed upload types (`ALLOWED_MIME_TYPES` in `actions.ts` and `lib/schemas/compliance.ts`) and would fall through to the `FileText` default. This is not a bug — `FileText` is a reasonable fallback for Word documents — but the mapping is inconsistent: `.xls` gets an explicit icon while `.doc` does not.

Additionally, `application/vnd.ms-excel` is **not** in the server-side `ALLOWED_MIME_TYPES` list (only `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` for `.xlsx` is allowed), so the `FileSpreadsheet` branch for `vnd.ms-excel` can never be reached through the upload flow — it is dead code.

**Recommendation:** Remove the unreachable `vnd.ms-excel` branch and consolidate the mapping against the actual allowed MIME types:

```typescript
function getFileIcon(mimeType: string) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    return <FileImage ... />
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return <FileSpreadsheet ... />
  }
  // PDF, DOCX, DOC all use FileText
  return <FileText ... />
}
```

---

### LO-03: `FrameworkBadge` Component Is Duplicated in Four Files

**File:** `app/(protected)/compliance/page.tsx:33`, `app/(protected)/compliance/obligations/ObligationsTable.tsx:32`, `app/(protected)/compliance/obligations/[id]/page.tsx:73`, `app/(protected)/compliance/obligations/[id]/attest/AttestationForm.tsx:60`, `app/(protected)/compliance/obligations/[id]/evidence/upload/EvidenceUploadForm.tsx:42`

**Issue:** The `FrameworkBadge` inline component (a `Record<RegulatoryFramework, string>` color map + `<span>`) is copy-pasted verbatim five times across the codebase. The decision to keep it inline was noted in 04-04-SUMMARY as "self-contained since it is only 10 lines", but it has grown to appear in 5 files. A future change to framework badge colors requires updates in five places.

**Recommendation:** Extract to `components/compliance/FrameworkBadge.tsx`:

```typescript
// components/compliance/FrameworkBadge.tsx
import { cn } from '@/lib/utils'
import type { RegulatoryFramework } from '@/types/compliance'
import { REGULATORY_FRAMEWORK_LABELS } from '@/types/compliance'

const FRAMEWORK_CLASSES: Record<RegulatoryFramework, string> = { /* ... */ }

export function FrameworkBadge({ framework }: { framework: RegulatoryFramework }) {
  return (
    <span className={cn('inline-flex rounded-[6px] px-[8px] py-[4px] text-[14px] font-medium', FRAMEWORK_CLASSES[framework])}>
      {REGULATORY_FRAMEWORK_LABELS[framework]}
    </span>
  )
}
```

---

## INFO

### IN-01: `verifyChecksum` in `lib/files/checksum.ts` Has a Latent Bug on Invalid `storedHash`

**File:** `lib/files/checksum.ts:24-29`
**Issue:** The length check `if (computed.length !== storedHash.length) return false` compares hex string lengths. `computed` is always 64 hex characters. If `storedHash` is a 64-character string containing non-hex characters (e.g., `"zzzz..."`), the length check passes but `Buffer.from(storedHash, 'hex')` silently truncates or pads the buffer to a shorter length, causing `timingSafeEqual` to throw `ERR_CRYPTO_TIMINGSAFEEQUAL_LENGTH` — which is caught by the `try/catch` and returns `false`. This is the correct behaviour, but the comment says "treat as mismatch" without noting that valid-length-but-non-hex hashes reach the `crypto.timingSafeEqual` path and incur the exception overhead. This is a latent correctness note rather than a bug, since the outcome (return false) is correct.

**Recommendation:** Add a hex-format pre-check before calling `Buffer.from`:

```typescript
const HEX_REGEX = /^[0-9a-f]+$/
if (!HEX_REGEX.test(storedHash)) return false
```

---

### IN-02: `getComplianceStats` Expiring Count Includes Today's Obligations

**File:** `lib/compliance/queries.ts:113-116`
**Issue:** The expiring count query uses `.gte('due_date', today)` and `.lte('due_date', thirtyDaysOut)`. This means obligations due exactly `today` are counted in both the "Overdue" stat (via `lt('due_date', today)` — no, wait: `lt` is strict less-than so today is excluded from overdue) and the "Expiring Soon" stat. An obligation due today shows in the Expiring Soon count with the warn accent, but is not in the Overdue count. This is arguably correct but may be surprising to users: "due today" appears as "expiring soon" rather than as urgent.

This is consistent with `isObligationOverdue` not flagging today-due items as overdue, but the combination means a today-due obligation is shown in amber ("expiring soon") rather than red ("overdue").

**Recommendation:** No code change required — document the intended behaviour in the query comment. If the product intent is that "due today" is urgent/red, adjust the overdue query to use `.lte` instead of `.lt` and the expiring query to use `.gt` instead of `.gte` (with a `due_today` threshold added to the dashboard stat).

---

### IN-03: `due_date` Zod Validation Accepts Any Non-Empty String — No Date Format Enforcement

**File:** `lib/schemas/compliance.ts:20`
**Issue:** `due_date: z.string().min(1, 'Due date is required.')` accepts any non-empty string. A client can submit `due_date: 'next year'` or `due_date: '99-99-9999'` which will fail at the Postgres layer (the `date` column type will reject non-date strings) and produce a DB error swallowed into `GENERIC_ERROR`. The user gets "An unexpected error occurred" instead of a clear validation message.

**Recommendation:** Add a regex or coerce check:

```typescript
due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format.'),
```

The `<Input type="date">` in the form already produces `YYYY-MM-DD` format in modern browsers, but this server-side validation closes the gap for API clients or browser compatibility edge cases.

---

### IN-04: `escalation.ts` Queries `user_profiles` by `active_role` Column — This May Not Reflect All Admins

**File:** `lib/compliance/escalation.ts:49-53`
**Issue:** The escalation service finds admin recipients by querying `user_profiles.active_role = 'admin'`. The `active_role` field reflects the currently selected role (from the custom access token hook). A user with an admin role who has switched to a different active_role (e.g., for a testing session) would not be returned by this query and would miss the escalation email. The `user_roles` table (which holds the durable role assignments) would be the more reliable source for finding all users assigned the admin role.

**Recommendation:** Query `user_roles` for the escalation admin list rather than `user_profiles.active_role`:

```typescript
const { data: adminRoles } = await admin
  .from('user_roles')
  .select('user_id')
  .eq('institution_id', obligation.institution_id)
  .eq('role', 'admin')
```

This ensures all users with the admin role assignment are notified, regardless of which active role they have selected.

---

## Finding Summary

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 1 | CR-01: HTTP header injection via Content-Disposition filename |
| HIGH | 3 | HI-01: Missing UUID validation on obligationId; HI-02: Silent partial failure in attestObligation; HI-03: TOCTOU race in evidence collision check |
| MEDIUM | 4 | ME-01: isObligationOverdue fires on due date day; ME-02: Escalation gap 1-6 days overdue; ME-03: evidence_count stub with sortable column; ME-04: XSS in escalation email HTML |
| LOW | 3 | LO-01: owner_id null coalesced to 'unassigned' string; LO-02: Dead code in EvidenceFileRow MIME mapping; LO-03: FrameworkBadge duplicated 5 times |
| INFO | 4 | IN-01: latent checksum non-hex path; IN-02: due-today ambiguity in stats; IN-03: due_date no date format validation; IN-04: active_role vs user_roles for escalation admin lookup |
| **Total** | **15** | |

---

_Reviewed: 2026-05-23T20:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
