---
status: partial
phase: 01-foundation-authentication-rls-and-audit-trail
source: [01-VERIFICATION.md]
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T00:00:00Z
---

## Current Test

[awaiting human testing with live Supabase project]

## Tests

### 1. Login flow end-to-end
expected: Visit `/login`, authenticate as `admin@grcnexus.gov.zw` / `Admin@GRC2026!`, confirm redirect to `/role-select`, select role, land on `/dashboard` with session persisting across browser refresh
result: [pending — requires supabase db push + env vars set]

### 2. MFA gate blocks admin without MFA
expected: After login as admin without MFA enrolled, middleware redirects to `/mfa/setup`. After MFA challenge completes, access to `/dashboard` granted. Device trust cookie set with 30-day expiry.
result: [pending — requires live Supabase]

### 3. Cross-institution RLS isolation
expected: Create two institutions, two users each. User from Institution A gets 0 rows when querying Institution B tables. No data leakage at any layer.
result: [pending — requires live Supabase + two seeded institutions]

### 4. audit_events immutability (three-layer)
expected: Running `UPDATE public.audit_events SET actor_id = null WHERE false` in Supabase SQL editor raises `insufficient_privilege` exception. Same for DELETE. REVOKE + RLS policy + RAISE EXCEPTION trigger all active.
result: [pending — requires supabase db push]

### 5. 30-day device trust
expected: After MFA verification with "Trust this device" checked, close browser, reopen, log in again — no MFA challenge shown. After 30 days (or clearing cookie), MFA challenge reappears.
result: [pending — requires live Supabase]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
