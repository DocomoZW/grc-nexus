# Deferred Items — Phase 02

## Pre-existing Issues (Out of Scope)

### types/supabase.ts corruption
- **Found during:** Task 5 (GREEN — TypeScript check)
- **Issue:** `types/supabase.ts` starts with corrupted PowerShell login role error message prepended to the file content. This causes `npx tsc --noEmit` to report TypeScript parse errors on lines 1-8 of that file.
- **Impact:** TypeScript compiler reports errors unrelated to this plan's files. The new files (`types/strategic.ts`, `lib/strategic/kpi-utils.ts`, `lib/schemas/strategic.ts`) have zero TypeScript errors.
- **Resolution needed:** A developer should regenerate `types/supabase.ts` using `supabase gen types typescript` or manually remove the corrupted header. This is NOT caused by Plan 02-02 changes.
