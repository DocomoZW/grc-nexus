# Pitfalls Research: GRC-Nexus

**Project:** GRC-Nexus (Governance, Risk, Compliance Platform)  
**Tech Stack:** Next.js 14 App Router + Supabase (Postgres, Auth, RLS)  
**Research Date:** 2026-05-22  
**Scope:** Greenfield prototype (4–6 weeks)

---

## Domain Pitfalls (GRC/Governance)

### Pitfall 1: Risk Scoring Collapse (Middle Clustering)

**What goes wrong:** All risk assessments cluster into the middle of the 5×5 matrix (scores 8–12), destroying the ability to differentiate between critical and low-level risks. The dashboard shows everything as medium risk, defeating the purpose of risk prioritization.

**Why it happens:**
- Vague scoring language ("Likely" vs. "Very Likely" undefined)
- Assessors lack clear calibration criteria
- No examples/rubrics for what each cell represents
- Subjective bias: assessors revert to "middle ground" when uncertain
- Organization-wide inconsistency (each person scores differently)

**Consequences:**
- Board sees no actionable risk prioritization
- Compliance officers can't allocate remediation resources
- Over-triage of minor risks, under-attention to critical ones
- Regulators question data integrity
- Prototype appears non-credible to stakeholders

**Prevention:**
- **Define explicit scoring rubrics at design time:** For each likelihood and impact level (1–5), document what "Likely" means (% probability threshold, historical frequency) with concrete examples per domain (financial, operational, compliance, reputational)
- **Create domain-specific impact examples:** "Impact 4 (High)" = "potential regulatory fine of 100K–1M" with specific evidence from policy
- **Run calibration workshops before go-live:** Present 5–10 pre-scored risk scenarios, have team score them, compare against rubric, discuss discrepancies
- **Track and audit scoring patterns:** Monthly audit of risk register shows proportion in each cell; alert if >60% fall in cells 8–12
- **Use heat map outlier detection:** System flags department where average risk score differs >30% from organization average
- **Phase-gate scoring quality:** Defer risk scoring to Phase 2/3; Phase 1 uses simplified Red/Yellow/Green classification

**Detection:**
- Building risk dashboard in Phase 1: if >60% of test data lands in cells 6–15, stop and recalibrate
- Stakeholder feedback on prototype: "All our risks look the same"
- Compare risk scores from different assessors on same risks: if variance >5 points, design is ambiguous

**Phase risk:** **Early (Phase 1)** — Discovered during risk register population in prototype build; fixing mid-build causes data rework

---

### Pitfall 2: Audit Trail Mutability (Immutability Not Enforced)

**What goes wrong:** Audit logs stored as mutable application data in same tables as operational data. Privileged users (admins) can silently delete, modify, or truncate audit records. System claims to have audit trail but doesn't actually retain evidence under pressure.

**Why it happens:**
- Audit trail implemented as feature, not architecture
- Same database privilege model (RLS) for operational and audit data
- No separate audit schema or immutable storage
- Developers assume "admins are trusted" (they are, until pressure/coercion)
- Performance optimization: immutable append-only logs seem slower
- Regulatory requirements not explicitly modeled in schema

**Consequences:**
- **Regulatory audit failure:** Auditors reject evidence trail as non-credible
- **Compliance violation:** PECOGA/PPDPA requires tamper-proof audit logs
- **Post-incident investigation impossible:** Can't prove what happened, who did it, when
- **Data breach aftermath:** Can't demonstrate logs weren't altered post-breach
- **Institutional credibility loss:** "Your audit trail is just another editable field"

**Prevention:**
- **Separate audit schema from day-one:** Create dedicated `audit_events` table with constraints: no UPDATE, no DELETE, only INSERT allowed
- **Immutable storage pattern:** Use Postgres TRIGGER to auto-insert into `audit_events` on any change to operational tables; triggers run as SECURITY DEFINER function with minimal privileges
- **Retention enforcement:** Archive old audit logs to separate storage (Supabase Storage) after retention period, then DELETE from DB only after successful archival (two-phase commit pattern)
- **Auditor-only access:** Create read-only `auditor_role` in Postgres with SELECT permission only on `audit_events`; no UPDATE/DELETE privilege in any form
- **Cryptographic chaining:** Hash previous log entry into each new log entry (like blockchain); validator can detect deletion or reordering even if not prevented
- **Test mutability at schema design time:** Write tests: admin tries to DELETE from audit table → fails; tries to UPDATE → fails; role trying to bypass RLS → fails
- **Compliance mapping in code:** Document which columns map to which regulatory requirement (e.g., `changed_by` → PECOGA Ch. 10:31 Section 5 "responsible officer")

**Detection:**
- Phase 1 build: compliance review asks "Can we see who created this risk record?" → trace through audit table
- Regulatory prep workshop: auditor reviews audit schema, asks "Can I modify this?" → if answer is "yes" in any form, design is broken
- Security testing: pentest scenario "admin deletes sensitive record and audit entry" → if both disappear, architecture fails
- Automated test: `SELECT COUNT(*) FROM audit_events WHERE event_type='DELETE'` should never increase after full system runs

**Phase risk:** **Early–Mid (Phase 1–2)** — Must be designed into schema before data entry; retrofitting is expensive and loses historical context

---

### Pitfall 3: Role-Based Access Control (RBAC) Without Least Privilege Defaults

**What goes wrong:** Roles defined broadly (e.g., "Risk Officer" has SELECT on all risk tables, UPDATE on all policy tables). Over time, role creep occurs: new requirements add permissions without removing old ones. Users see data they shouldn't (compliance data, confidential board packs, personnel-linked incident reports).

**Why it happens:**
- RBAC designed as whitelist starting from nothing ("add permission when needed") but implemented as blacklist ("deny if explicitly forbidden")
- Role definitions created for average case, not exceptions
- No regular RBAC audit or "permission cleanup"
- Pressure to move fast: easier to grant broad role than create new role with fine-grained permissions
- Supabase RLS policies complex to test; developers skip edge cases
- Confusion between "institutional role" (board, audit, risk) and "data object role" (owns risk, created incident, assigned remediation)

**Consequences:**
- **Data leakage:** Compliance officer sees confidential board risk assessment meant for board only
- **Incident confidentiality breach:** Whistleblower report accessible to person being investigated
- **Regulatory violation:** PECOGA requires segregation of duties (SoD); over-permissioned roles violate this
- **Audit failure:** Cannot demonstrate least-privilege enforcement
- **Compliance officer overwhelmed:** Sees too much data, can't focus on critical obligations
- **Prototype loses credibility:** Demo shows "Everyone can see everything"

**Prevention:**
- **Explicit least-privilege schema:** Design permissions as default-deny + explicit grants
  ```
  -- Example in Postgres
  REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM risk_officer;
  GRANT SELECT ON risk_registers TO risk_officer;
  GRANT INSERT, UPDATE ON compliance_obligations TO risk_officer WHERE owner_id = auth.uid();
  ```
- **Role matrix document:** Create table: Role × Data Object × Operation (Select/Insert/Update/Delete); require explicit justification for each cell; deny by default
- **Implement SoD checks:** Identify conflicting roles (e.g., "Approver" and "Requester" same person) and block via trigger or RLS policy
- **Test RBAC at unit level:** For each role, write test: "Risk Officer tries to read Board Packs → denied; tries to read Risk Registers → allowed; tries to update someone else's risk → denied"
- **Monthly RBAC audit:** Query Postgres to extract effective permissions per role; compare to documented matrix; alert on drift
- **Use Supabase RLS policy builder:** Test policies from **client SDK** (not SQL Editor, which bypasses RLS); catch leaks in pre-deployment testing
- **Implement per-record ownership:** Every compliance obligation, risk, incident has `owner_id` and `visibility_scope` (Owner/Department/Board/Public); RLS enforces at query time
- **Document data sensitivity:** Tag tables (risk_registers=Confidential, department_kpis=Internal, audit_findings=Restricted); use tags in permission matrix

**Detection:**
- Phase 1 testing: "Log in as Governance Officer; try to open Risk Register → see risks you shouldn't" = FAIL
- Stakeholder review: different users see wildly different data volumes (e.g., Compliance Officer sees 10K records, Risk Officer sees 100 → permission design asymmetric)
- Supabase logs show RLS bypass attempts (common in development; means policy logic flawed)
- Audit of actual data access: query Postgres logs for SELECT queries with high row counts by low-privilege users

**Phase risk:** **Early–Mid (Phase 1–2)** — RLS policies hardest to retrofit; test early; data model must assume fine-grained permissions from day 1

---

### Pitfall 4: Compliance Evidence Upload Without Retention + Immutability

**What goes wrong:** Users upload compliance evidence (signed board minutes, audit confirmations, regulatory filings) into Supabase Storage. Later, files disappear (accidental deletion, storage misconfiguration, quota exceeded). Or files are silently overwritten. Compliance officer can't produce evidence at audit. Regulators question file integrity.

**Why it happens:**
- Storage treated like temporary cache, not permanent record
- No automatic backup or version control
- File versioning disabled; latest upload overwrites previous (prevents showing "we had this at time T")
- Supabase Storage ACLs misconfigured (too permissive or broken)
- No retention policy: old evidence automatically purged after N days
- No file integrity check (checksum/hash stored) to detect tampering
- Lazy approach: "Deleting old files saves quota costs"

**Consequences:**
- **Compliance failure:** Cannot produce evidence at regulatory audit
- **Repudiation:** "We uploaded that?" "No we didn't, someone deleted it"
- **Data loss incident:** Confidential board packs with strategic decisions gone
- **Audit findings:** "Evidence of control not retained"
- **Reputational damage:** Regulator questions entire institution's record-keeping

**Prevention:**
- **Immutable storage strategy:** Use Supabase Storage with **version immutability**
  - Generate unique filename on every upload (include timestamp, hash): `compliance_evidence/board_packs/2026-01-15_board_pack_v7f9d3a.pdf` not `board_pack.pdf`
  - Never allow DELETE or UPDATE on uploaded files
  - If corrections needed, upload new version with clear metadata ("supersedes v7f9d3a")
- **Mandatory metadata:** Every evidence file must have:
  - `uploaded_by` (user ID)
  - `uploaded_at` (timestamp)
  - `evidence_for` (which obligation? which audit finding? which risk?)
  - `file_hash` (SHA-256, computed at upload, stored, never changes)
  - `expires_at` (minimum retention period calculated from regulatory requirement)
- **Retention enforcement:** Trigger audit policy that prevents deletion until `expires_at` passes; after expiry, archive to cold storage (not deleted)
- **Backup integration:** Nightly export of all evidence metadata + S3 mirror in separate account (immutable S3 bucket with versioning and legal hold)
- **Access control:** Evidence files have same RBAC as data (e.g., board pack only visible to board members + audit, not general risk officers)
- **Checksum validation on download:** System recomputes SHA-256 on retrieval; compare to stored value; alert if mismatch (file tampered with, corrupted)
- **Compliance mapping:** Document which evidence maps to which regulatory requirement (e.g., board minutes → PECOGA verification of board oversight)

**Detection:**
- Phase 1 testing: Upload board pack, then delete file directly via Supabase console → system should prevent this
- Compliance officer workflow test: "Produce evidence of risk approval from 3 months ago" → file must still exist with original hash
- Audit scenario: regulator asks "Can you prove this was approved on date X?" → trace evidence file creation, hash, metadata
- Storage audit: list all files; count how many have deletion pending; should be zero

**Phase risk:** **Early–Mid (Phase 1–2)** — Storage strategy must be defined before Phase 1 compliance module; retrofitting loses historical evidence

---

### Pitfall 5: Reporting Requirements Underestimated (PDF Generation, Statutory Format)

**What goes wrong:** Prototype promises "Generate Statutory Compliance Report in PDF" in Phase 1. Builders discover:
- Formatting complexity (government PDFs have rigid table structures, page breaks mid-table cause rejections)
- Data consistency: PDF shows different values than dashboard (53% of filings have PDF/electronic data mismatches)
- Regulatory formatting evolving (current PECOGA guidance changed twice in 12 months; PDF logic brittle)
- No version control: which PDF version was sent to regulator? Can we reproduce it?
- Manual review bottleneck: no automated validation that PDF matches data

**Why it happens:**
- Assumed "just dump data to PDF template" is simple
- Regulatory requirements treated as static ("The report format is X")
- No involvement of actual compliance officer in requirements phase
- No look at real statutory reports from comparable institutions
- PDF generation library chosen based on docs, not regulatory domain
- Prototype timeline pressure: "PDF can wait, show the dashboard"

**Consequences:**
- **Regulatory rejection:** PDF doesn't match statutory format; resubmit required (2–4 week delay)
- **Audit finding:** "Values inconsistent between data system and reported figures"
- **Compliance officer manual work:** Hand-formatting reports, cross-checking values (high error risk, non-scalable)
- **Prototype credibility loss:** Stakeholders see "Report" feature but output is unusable
- **Version mismatch:** Can't audit which data generated which report; Compliance Officer can't explain discrepancies

**Prevention:**
- **Regulatory requirement research (Phase 0–1):** Before building reporting, obtain:
  - Latest PECOGA/PPDPA statutory report template with all formatting rules
  - 2–3 real reports from other MDAs/SOEs showing acceptable format variations
  - Regulator guidance on "acceptable PDF structure" (table format, page breaks, font sizes, color coding)
  - Mapping: which data field → which report line item
- **Schema-driven reporting:** Report structure derived from regulatory spec, not ad-hoc
  - Create `statutory_report_schema` table documenting line-item-to-data-field mapping
  - Generate PDF programmatically from schema + current data
  - When regulation changes, update schema (versioned); old reports automatically reproducible
- **Data consistency enforcement:** Before PDF generation, run validation query:
  ```
  SELECT report_line, dashboard_value, calculated_value, 
         CASE WHEN dashboard_value != calculated_value THEN 'MISMATCH' END
  FROM report_data_validation;
  ```
  Block PDF generation if any mismatches exist; require manual review + sign-off
- **PDF version control:** 
  - Store PDF as blob in Postgres with metadata: `report_versions(id, regulation_version, data_snapshot_id, generated_by, generated_at, signed_off_by, signed_off_at)`
  - Never regenerate old reports from current data; retrieve from archive
  - Link compliance obligation to specific report version: "Evidence for 2026 PECOGA filing is report_version_id=47"
- **User sign-off workflow:** PDF not final until compliance officer clicks "Approve for filing"; signature stored in audit log; PDF locked (no changes after approval)
- **Pilot on real data:** Before Phase 2 release, provide draft report to actual regulator or compliance consultant; get feedback; iterate schema
- **Defer complex reporting to Phase 2:** Prototype can show simplified "Compliance Status Summary" (one-page, dashboard-derived); defer "Full Statutory Report" to Phase 2 when requirements fully understood

**Detection:**
- Phase 1 testing: Generate report → send to Compliance Officer → does it match their expectation? "This isn't the format the regulator expects"
- Regulatory readiness review: stakeholder compares prototype report to template from PECOGA → identifies formatting gaps
- Data audit: compare risk counts in dashboard vs. PDF report → should be identical (pick random month and verify)
- Version scenario: regenerate old report from new data → check if values differ → they will (design issue: no snapshot isolation)

**Phase risk:** **Mid–Late (Phase 2–3)** — Reporting complexity underestimated; should not be "quick feature" in prototype; deferring to Phase 2 with proper regulatory input is safer

---

### Pitfall 6: Poor UX Leading to Compliance Officer Workarounds

**What goes wrong:** Dashboard designed by engineers, not compliance domain experts. Interface:
- Cluttered with 50 metrics; no clear "What do I do first?"
- Key workflows buried (e.g., "Attest that this obligation is complete" requires 4 clicks + form)
- Jargon used without explanation; compliance officer Googles terms while using system
- Requires training; users forget workflows between uses
- System feels heavy; officers revert to email/Excel for actual work, treating GRC system as "compliance checkbox"

**Consequences:**
- **Tool adoption failure:** Compliance officers don't use system; data becomes stale
- **Data quality decay:** Officers enter bare minimum; skipped fields; inaccurate dates
- **Missed deadlines:** No notification system; deadline passes; regulator contacts institution
- **Audit trail worthless:** System records what was entered, but nobody was actually using system for decisions
- **Prototype feedback:** "System is hard to use; we'll stick with spreadsheets"
- **Business impact:** Governance officer can't get quick answer to "What obligations are due in next 30 days?"

**Prevention:**
- **Domain expert involvement (Phase 1 design):** Involve actual compliance officer (or several) in wireframing; don't just show mockups, build together
- **User research before Phase 1:** Interview 3–5 compliance officers from comparable institutions
  - "Walk me through your monthly compliance check-in — what do you actually do?"
  - "What decision do you make first when you open a system?"
  - "What frustrates you most about current tools?"
- **Simple critical path first:** Design for the 80% case: "Mark obligation as complete + attach evidence" → should take <1 minute for simple obligation
- **Clear information hierarchy:**
  - Above the fold: "5 obligations due this week" + action buttons
  - Secondary: Trends (% compliance up/down month-over-month)
  - Tertiary: Raw data tables for power users
- **Minimize friction:** 
  - Single-click to "Attest obligation complete" (no form if just signature needed)
  - Smart defaults (pre-fill description from previous year; suggest responsible officer based on history)
  - Keyboard shortcuts for power users
- **Contextual help:** Tooltips explain jargon; links to policy docs; "Why are we asking this?" for each field
- **Progressive disclosure:** Show expert features only to advanced users (toggle in settings); default interface minimal
- **Notification tuning:** "Due soon" notifications at 14 days before deadline, then 7 days, then 1 day; allow officer to snooze or mark "already done offline"
- **Usability testing with real users (Phase 1):** 3–5 compliance officers from partner institutions use prototype for 15 minutes, think aloud
  - Track: time to find information, clicks needed, questions asked, frustration indicators
  - Fix top 3 usability issues before Phase 2
- **Defer advanced features:** Phase 1 shows simple status + workflow; defer advanced filtering, custom dashboards, bulk operations to Phase 2

**Detection:**
- Phase 1 demo with Compliance Officer: watch them use system without guidance; if they ask "Where do I click?" more than 2x, UX has issues
- Prototype feedback: "I'd use this if..." → offers suggest UX problem (e.g., "if it was faster to enter data" = friction in attestation flow)
- Adoption metric: if more than 20% of fields are blank in test data, system is too complex or unclear what to fill
- Comparative test: give officer same task in GRC-Nexus and Excel spreadsheet; measure time and error rate; if Excel faster, redesign UX

**Phase risk:** **Early (Phase 1)** — UX problems compound over time; fixing at Phase 2 requires rework; test with real users early and often

---

## Technical Pitfalls (Next.js 14 + Supabase)

### Pitfall 7: Hydration Mismatch Due to Browser API Access

**What goes wrong:** Component uses `typeof window !== 'undefined'` to check if client-side, or uses `localStorage`, `Date.now()`, or random values directly in render logic. Server renders one thing; browser hydrates differently. React throws hydration mismatch error. UI flashes, becomes unresponsive, or shows stale data.

**Why it happens:**
- Browser APIs (window, localStorage, navigator) don't exist on server; accessing them throws error, so guard code seems necessary
- Guard code (`if (typeof window !== 'undefined')`) returns different output on server vs. client if conditional is part of render output
- Time-dependent values: `new Date()` renders differently on server than client
- Random values: `Math.random()` differs between server and client render
- Supabase session state: checked via `useEffect` after hydration, but component renders before effect runs; shows unauthenticated state on initial render

**Consequences:**
- **Development friction:** Hydration errors are cryptic; time spent debugging
- **Production bugs:** Interactive features mysteriously fail or show stale state; users report "weird UI behavior"
- **Performance hit:** React disables hydration, switches to full client-side render (loses SSR benefits)
- **User experience:** Flickering, flashing, or unresponsive components
- **Dashboard reliability:** Risk heatmap renders incorrectly; compliance officer doesn't trust system

**Prevention:**
- **Architecture rule: separate server from client logic**
  - Server components (default in App Router): fetch data, no browser APIs
  - Client components ('use client'): browser logic, hydration-safe
  - Pass data via props; don't compute in shared component
  ```typescript
  // ❌ BAD: Hydration mismatch
  export default function RiskCard() {
    const isClient = typeof window !== 'undefined'; // Different on server vs client!
    return <div>{isClient ? 'Ready' : 'Loading'}</div>;
  }
  
  // ✅ GOOD: Server component fetches, client component displays
  export default async function RiskPage() {
    const risks = await fetchRisks(); // Server
    return <RiskCards risks={risks} />; // Client component gets data
  }
  
  'use client';
  function RiskCards({ risks }) {
    const [filter, setFilter] = useState(''); // Client state is safe
    return <div>{risks.filter(...)}</div>;
  }
  ```
- **Delay browser-only code to useEffect:**
  ```typescript
  'use client';
  import { useEffect, useState } from 'react';
  
  export function ClientOnlyFeature() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []); // Runs only on client
    
    if (!mounted) return null; // Skip render on server
    return <div>{localStorage.getItem('key')}</div>; // Safe now
  }
  ```
- **Suppress hydration errors only when intentional:**
  ```typescript
  'use client';
  export default function DateDisplay() {
    // ❌ BAD: Hiding hydration error
    return <div suppressHydrationWarning>{new Date().toISOString()}</div>;
    
    // ✅ GOOD: Delay until after hydration
    const [date, setDate] = useState('');
    useEffect(() => { setDate(new Date().toISOString()); }, []);
    return <div>{date || 'Loading...'}</div>;
  }
  ```
- **Test with `next dev`, not just `npm run build && npm start`:** Development mode catches hydration mismatches; production doesn't always (silent failure)
- **For Supabase Auth:** Wrap authenticated components in Suspense boundary with fallback; fetch session in server component, pass to client
  ```typescript
  export default async function Dashboard() {
    const session = await getSupabaseSession(); // Server
    if (!session) notFound();
    return <AuthenticatedDashboard session={session} />; // Client component
  }
  ```

**Detection:**
- Next.js console in browser: "Hydration failed" message + stack trace
- Build logs during `next build`: "getStaticProps cannot use browser APIs"
- Cypress/E2E tests: click interactive element → doesn't respond → hydration issue
- Monitor error logs in Vercel: "React hydration" errors appear after deployment
- Manual test: disable JavaScript in browser, reload page → if page content differs from JS version, hydration will fail

**Phase risk:** **Early (Phase 1)** — Hydration issues discovered during first dashboard build; fixing requires architectural changes if not designed correctly

---

### Pitfall 8: Supabase RLS Policies Disabled by Default / Policy Bypass via Views

**What goes wrong:** Builder creates table in Supabase; RLS is disabled by default. API endpoint is auto-generated and publicly accessible (to anyone with anon key). 170+ apps were exposed in early 2025 before developers enabled RLS. Or: developer creates a view (for query convenience) without realizing views bypass RLS by default in older Postgres; data accessible to wrong roles.

**Why it happens:**
- Supabase defaults: RLS disabled; public REST API for every table
- Developer assumes "if user has anon key, they can use the API" (wrong; needs RLS to enforce row filtering)
- Convenience: creating views for complex queries without thinking about security implications
- Postgres 14 and earlier: views default to SECURITY DEFINER, run as creator role (usually postgres superuser), bypasses RLS
- Testing in SQL Editor: tests pass because SQL Editor bypasses RLS; real client SDK fails differently (not obvious until deployed)
- Documentation easy to miss: RLS is feature you opt-in to, not default protection

**Consequences:**
- **Data breach:** Confidential risk assessments, board packs, audit findings accessible to anyone with anon key
- **Regulatory violation:** PECOGA/PPDPA breach notification required
- **Institutional credibility loss:** "We exposed governance data"
- **Compliance failure:** Audit reveals data was accessible without RLS
- **Prototype security theater:** System looks secure but isn't

**Prevention:**
- **RLS enabled as first step:** Before writing any data model code, run:
  ```sql
  ALTER TABLE IF EXISTS [any_table] ENABLE ROW LEVEL SECURITY;
  ```
  Make this a checklist item in phase kickoff.
- **Schema migration script includes RLS:** Every migration file includes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for new tables
- **Test RLS from client SDK, not SQL Editor:**
  ```typescript
  // ✅ Test real client (SDK) behavior
  const { data, error } = await supabase.from('risk_registers')
    .select('*')
    .eq('institution_id', 'org-2');
  // Should be empty if current user belongs to org-1, even with SELECT permission
  ```
- **Document RLS policy intent:** Every policy should have comment:
  ```sql
  -- Risk registers: users can see only their own institution's risks
  CREATE POLICY "users_see_own_institution_risks" ON risk_registers
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'institution_id' = institution_id::text);
  ```
- **Views: enforce RLS in Postgres 15+:**
  ```sql
  -- Postgres 15+
  CREATE VIEW risk_heatmap WITH (security_invoker = true) AS
    SELECT ... FROM risk_registers;
  -- security_invoker=true means view obeys underlying table's RLS
  ```
  For Postgres <15, avoid views; use RPC functions instead.
- **Never use JWT metadata claims directly in RLS policies without validation:**
  ```sql
  -- ❌ BAD: user_metadata can be modified by client
  WHERE organization_id = (auth.jwt() ->> 'user_metadata')::uuid
  
  -- ✅ GOOD: use user_roles table (server-controlled)
  WHERE organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  ```
- **Service key isolation:** Service key (for admin operations) should have minimal scope; separate from anon key (for client access)
  - Anon key: read-only on public data, no write access
  - Authenticated key: filtered by RLS
  - Service key: admin-only, never exposed to client
- **Pre-deployment security checklist:**
  - [ ] All tables have RLS enabled
  - [ ] All views use security_invoker=true (Postgres 15+)
  - [ ] No table created in last 30 days without RLS
  - [ ] All policies tested via SDK (not SQL Editor)
  - [ ] No use of JWT metadata in policies (use user_roles instead)
  - [ ] Service key never in client-side code

**Detection:**
- Phase 1 schema setup: run `SELECT schemaname, tablename, rowsecurity FROM pg_tables` → any table with `rowsecurity=false` = FAIL
- Deploy to staging: query database with anon key; should see zero rows for restricted tables → if see rows, RLS is broken
- Penetration test: anonymous user hits API endpoints; should get 403 Forbidden or empty result set for sensitive tables
- Supabase dashboard: check "Database" → "RLS" tab; any red (RLS disabled) = fix before Phase 2
- Monthly audit: `SELECT tablename FROM pg_tables WHERE rowsecurity=false` → should be empty for all data tables

**Phase risk:** **Immediate (Phase 0–1)** — RLS must be enabled during initial schema design; retrofitting is error-prone and requires data re-provisioning

---

### Pitfall 9: Supabase Auth Middleware Token Expiry / Cache Poisoning

**What goes wrong:** Supabase JWT expires after 1 hour (default). Middleware refreshes token and sets it via Set-Cookie header. If Next.js caches the response (ISR, route caching), the Set-Cookie is cached too. Next user gets the previous user's token. Attacker is logged in as someone else.

**Why it happens:**
- ISR (Incremental Static Regeneration) on pages like `/dashboard` to improve performance
- Response-level caching doesn't distinguish between users
- Set-Cookie header included in cached response
- Subsequent request receives cached response including old user's JWT
- Second user's browser stores token; becomes authenticated as first user
- Supabase doesn't warn about this interaction

**Consequences:**
- **Privilege escalation:** Regular user becomes authenticated as board member
- **Data breach:** User A sees User B's risk assessments, compliance data, incident reports
- **Regulatory failure:** Unauthorized access to confidential information
- **Audit trail compromised:** User B's actions credited to User A
- **Prototype catastrophic failure:** Trust completely broken

**Prevention:**
- **Never cache authenticated pages:** Add to all routes requiring auth:
  ```typescript
  // app/dashboard/page.tsx
  export const dynamic = 'force-dynamic'; // Never cache
  
  // OR for specific routes:
  // export const revalidate = 0;
  ```
- **Use `getSupabaseUser()`, not `getSession()`:**
  ```typescript
  // ❌ BAD: getSession() doesn't revalidate token
  const session = await supabase.auth.getSession();
  
  // ✅ GOOD: getUser() hits server every time
  const { data: { user }, error } = await supabase.auth.getUser();
  ```
- **Middleware should always refresh:** Every request goes through middleware that calls `supabase.auth.refreshSession()` and updates cookies
  ```typescript
  // middleware.ts
  export async function middleware(request: NextRequest) {
    let res = NextResponse.next({ request });
    const supabase = createServerClient(...);
    
    // Always attempt refresh (even if token looks valid)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      res = NextResponse.redirect(new URL('/login', request.url));
    }
    
    return res;
  }
  ```
- **Test with multiple browser sessions:** Open two browser windows, log in as User A and User B simultaneously; verify User B's dashboard shows only User B's data (not cached User A data)
- **Vercel deployment setting:** If using ISR, explicitly exclude all `/dashboard/*` and authenticated routes
  - Revalidate value = `0` for authenticated pages
  - Revalidate value = `3600` (1 hour) only for public, non-user-specific pages

**Detection:**
- Phase 1 build: deploy to Vercel; open two browser windows; log in as different users; load same page in both → if one user sees other's data, caching is broken
- Vercel analytics: if response times drop suspiciously (cached), but page shows user-specific data, investigate
- Supabase auth logs: if single JWT used across multiple user IDs in short time window, cache poisoning occurred
- E2E test: login as User A → cache dashboard → logout User A → login as User B → User B's dashboard should show User B data, not User A's

**Phase risk:** **Early–Mid (Phase 1–2)** — Cache poisoning discovered during multi-user testing; architectural fix (disabling cache) must happen early

---

### Pitfall 10: Client-Level Supabase Connection Pool Exhaustion

**What goes wrong:** Vercel serverless environment; each request creates a Supabase client at module level (not inside function). With 30 concurrent requests, 30 connections opened. Supabase free tier allows 60 connections. System hits limit. New requests get "too many connections" error. API becomes unavailable.

**Why it happens:**
- Supabase initialized at module top level (reused across requests? No, Lambda creates new process per request)
- Misunderstanding of serverless: assumed connection pooling works like traditional Node server (it doesn't)
- No connection pooling at application level in serverless
- Supabase default pool: each SDK client = 1 new connection
- Load increases (more concurrent Lambdas): connections leak or aren't closed properly
- Monitoring missing: nobody notices "connection count creeping up"

**Consequences:**
- **Prototype becomes unavailable:** After a few concurrent users, API errors spike
- **Cascading failure:** Errors in error handlers try to log to DB, creating more connections, worsening problem
- **User frustration:** Dashboard loads for one user, fails for second
- **Compliance failure:** System unavailable during regulatory deadline
- **Scalability myth:** "System works locally but fails at scale"

**Prevention:**
- **Use Supabase pooler URL, not direct Postgres URL:**
  ```typescript
  // ❌ BAD: Direct connection to Postgres
  const connectionString = 'postgresql://postgres.xxx.supabase.co:5432/postgres';
  
  // ✅ GOOD: Pooler URL with connection pooling
  const connectionString = 'postgresql://postgres.xxx.pooler.supabase.co:6543/postgres';
  // (Note: port 6543 for transaction-mode pooling; 5432 for session mode)
  ```
- **Create one Supabase client per request, not per module:**
  ```typescript
  // ❌ BAD: Module-level client
  const supabase = createClient(url, key);
  export async function handler(req) {
    const { data } = await supabase.from('risks').select();
  }
  
  // ✅ GOOD: Function-level client
  export async function handler(req) {
    const supabase = createClient(url, key); // New per request
    const { data } = await supabase.from('risks').select();
  }
  ```
- **Configure pool size based on expected concurrency:**
  - Supabase dashboard → Project → Settings → Database → Connection pool
  - Rule: pool size = 30 for serverless (Vercel handles ~30 concurrent Lambdas)
  - Each Supabase client uses 1 pooled connection; 30 clients = 30 pooled connections
- **Set reasonable connection timeout:**
  ```typescript
  const supabase = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } }, // Rate limit
    db: {
      schema: 'public',
      queryTimeout: 30000, // 30 second timeout on queries
    },
  });
  ```
- **Monitor connection usage:**
  - Supabase dashboard → Monitoring → Connections (live graph)
  - Alert if connections exceed 80% of limit (48/60 on free tier)
  - Vercel logs: look for "FATAL: remaining connection slots are reserved" errors
- **Test under load:** Use `artillery` or `k6` to simulate concurrent users
  ```bash
  artillery run load-test.yml
  # If errors start after 20 concurrent users, pool is too small or connections leak
  ```
- **For Phase 1 prototype: use Supabase free tier with conservative pool**
  - Start with 10 pooled connections
  - Monitor during stakeholder testing
  - Scale up to 30 for Phase 2 if needed

**Detection:**
- Phase 1 demo with multiple simultaneous users: if >5 concurrent requests cause errors, pool exhaustion is likely
- Supabase dashboard: Monitoring → Connections graph shows sawtooth pattern (spikes to limit, then drops) = connections not closing properly
- Vercel logs: search for "connection" + "exceeded" = pool limit hit
- Load test: `artillery quick --count 50 --num 5 https://app.vercel.app/api/risks` → if fails after 20–30 requests, investigate pool

**Phase risk:** **Mid (Phase 1–2)** — Pool exhaustion discovered during load testing or stakeholder demo; fixing requires switching to pooler URL (easy fix)

---

### Pitfall 11: Complex Dashboard Query Performance (N+1, Missing Indexes)

**What goes wrong:** Dashboard query fetches risks (N rows); for each risk, fetches associated compliance obligations (N+1 query). For each obligation, fetches evidence files (N+1 query). Total: 1 + N + N×M queries. Page takes 15 seconds to load. RLS policy adds subqueries that scan entire tables. Pagination doesn't help because base query scans all rows.

**Why it happens:**
- Dashboard designed for "show everything"; no query optimization upfront
- Supabase SDK generates queries row-by-row (typical ORM pattern); no batching
- RLS policy: `institution_id IN (SELECT id FROM institutions WHERE...)` on every row scan
- Missing indexes on columns in RLS policies
- No query planning; "it works on 100 rows, ship it; scale later"
- Lazy loading assumed to be solution, but pagination still has N+1 problem

**Consequences:**
- **Poor user experience:** Dashboard unusable; 30-second load times
- **Compliance officer frustration:** "System is slow; I'll use spreadsheet"
- **Regulatory demo failure:** Stakeholder demo times out
- **Prototype loses credibility:** "Doesn't scale; needs full rewrite"
- **Late-phase rework:** Performance optimization pushed to Phase 3 because not addressed in Phase 1

**Prevention:**
- **Query analysis before building dashboard:**
  - Map out dashboard sections (risk summary, compliance status, KPI trends)
  - For each section, count queries: 1 fetch + N sub-fetches = how many total?
  - If N+1 pattern, redesign data model or add denormalization
- **Use `select()` with relationship expansion efficiently:**
  ```typescript
  // ❌ BAD: N+1 pattern
  const risks = await supabase.from('risks').select('*');
  const obligations = await Promise.all(
    risks.map(r => supabase.from('risk_obligations')
      .select('*')
      .eq('risk_id', r.id))
  );
  
  // ✅ GOOD: Single query with eager loading
  const risks = await supabase.from('risks')
    .select(`
      id, title, likelihood, impact,
      risk_obligations (id, title, due_date),
      risk_evidence (id, file_url)
    `)
    .eq('institution_id', institutionId);
  // Single query, all data
  ```
- **Index columns used in RLS policies:**
  ```sql
  -- If RLS policy uses institution_id, index it
  CREATE INDEX idx_risks_institution_id ON risks(institution_id);
  
  -- If RLS uses WHERE user_id IN (SELECT ...), index user_id in that table
  CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
  ```
- **Use views or RPC functions for complex aggregations:**
  ```sql
  -- Dashboard summary: counts + trends
  CREATE OR REPLACE FUNCTION get_dashboard_summary(institution_id UUID)
  RETURNS TABLE(
    total_risks INT,
    high_risks INT,
    compliance_rate DECIMAL,
    overdue_obligations INT
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT 
      COUNT(DISTINCT r.id)::INT,
      COUNT(DISTINCT r.id) FILTER (WHERE (r.likelihood * r.impact) > 15)::INT,
      COUNT(*) FILTER (WHERE status = 'Complete')::DECIMAL / COUNT(*)::DECIMAL,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'Complete')::INT
    FROM risks r
    JOIN compliance_obligations co ON r.id = co.risk_id
    WHERE r.institution_id = $1;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
  Call from dashboard: 1 query, 1 result row
- **Pagination + filtering:**
  - Limit initial load to 20–50 items
  - Lazy load on scroll or pagination click
  - Use `limit` and `offset` efficiently:
    ```typescript
    const { data } = await supabase.from('risks')
      .select('...')
      .eq('institution_id', institutionId)
      .range(0, 49); // First 50
    ```
- **Supabase performance testing built-in:**
  - Supabase CLI includes profiling tools
  - Test query plans: `EXPLAIN ANALYZE SELECT...`
  - Verify indexes are used:
    ```sql
    EXPLAIN ANALYZE
    SELECT * FROM risks WHERE institution_id = '...';
    -- Should show "Index Scan" not "Seq Scan"
    ```
- **Monitor dashboard load time in Vercel:**
  - Next.js Speed Insights shows API call duration
  - Alert if dashboard API call >3 seconds
  - Trace slow query: Supabase dashboard → Logs → filter by slow queries

**Detection:**
- Phase 1 dashboard build: load dashboard locally → browser DevTools shows how many requests; if >50, N+1 problem likely
- Vercel Analytics: dashboard API endpoint taking 5+ seconds (should be <1s)
- Supabase logs: same query repeated N times (e.g., SELECT FROM risks; then SELECT FROM obligations WHERE risk_id=... repeated 20 times)
- Manual test: refresh dashboard; watch network tab; count requests; if count exceeds number of data objects + 3, optimize

**Phase risk:** **Mid (Phase 1–2)** — Performance issues discovered during first dashboard demo; early query design prevents rework

---

### Pitfall 12: Supabase Realtime Sync Without Subscription Management

**What goes wrong:** Dashboard enables Realtime to show live risk updates. Multiple dashboard subscriptions opened; on logout, not all cleaned up. Memory leak accumulates. After 100 dashboard reloads, browser crashes or connections overwhelm Supabase Realtime. Or: Realtime sends every change to every subscribed user; compliance officer's dashboard updates constantly, becomes unusable.

**Why it happens:**
- Supabase Realtime feature seems easy: `subscribe()` to changes
- Forgot to `unsubscribe()` on component unmount
- Multiple dashboard instances (tabs, redirects) each subscribe independently
- No filtering: subscription broadcasts all changes (e.g., all risks in entire institution); UI updates for every change, even ones not visible
- Testing locally: not enough users to trigger memory leak or subscription explosion
- Assumption: "Realtime is low-cost; use it liberally"

**Consequences:**
- **User experience degradation:** Dashboard feels sluggish after 5 minutes of use
- **Memory leaks:** Browser becomes unresponsive; requires refresh
- **Compliance officer abandonment:** "This system is slow; back to spreadsheet"
- **Supabase quota exhaustion:** Realtime messages spike; hit billing limits
- **Prototype failure:** Stakeholder demo has "updates are slow" feedback
- **Production instability:** Live system degrades under normal usage

**Prevention:**
- **Always unsubscribe on cleanup:**
  ```typescript
  'use client';
  import { useEffect } from 'react';
  import { supabase } from '@/lib/supabase';
  
  export function RiskUpdates() {
    useEffect(() => {
      const subscription = supabase
        .channel(`risks:${institutionId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'risks',
          filter: `institution_id=eq.${institutionId}` // Filter at source
        }, (payload) => {
          // Update UI
        })
        .subscribe();
      
      return () => {
        subscription.unsubscribe(); // ← CRITICAL: cleanup
      };
    }, [institutionId]);
  }
  ```
- **Filter subscriptions at source:**
  - Don't subscribe to `risks` table; subscribe to `risks` filtered by `institution_id`
  - Supabase Realtime filters server-side; reduces message volume
- **Single subscription per page, not per component:**
  - Use context or state management to share single subscription across components
  - Multiple components read from shared state, not multiple subscriptions
  ```typescript
  // ❌ BAD: Each component subscribes
  <Dashboard>
    <RiskList /> {/* subscribe to risks */}
    <ComplianceStatus /> {/* subscribe to risks again */}
    <KPIChart /> {/* subscribe to risks yet again */}
  </Dashboard>
  
  // ✅ GOOD: Single subscription in parent
  <Dashboard> {/* subscribe once, pass data via props */}
    <RiskList risks={risks} />
    <ComplianceStatus risks={risks} />
    <KPIChart risks={risks} />
  </Dashboard>
  ```
- **Debounce or throttle updates:**
  ```typescript
  import { debounce } from 'lodash';
  
  const handleChange = debounce((payload) => {
    setRisks([...risks, payload.new]);
  }, 1000); // Max 1 update per second
  ```
- **Use Realtime selectively:** Only for data that changes frequently and needs live updates (e.g., incident status). Don't use for static data (e.g., compliance obligation descriptions, PDF archives).
- **Test subscription cleanup:**
  ```typescript
  // In test
  const { unmount } = render(<RiskUpdates />);
  expect(subscriptionsActive()).toBe(1);
  unmount();
  expect(subscriptionsActive()).toBe(0); // Should be zero after unmount
  ```
- **Monitor Realtime usage:**
  - Supabase dashboard → Realtime → Message count / Concurrent connections
  - Should be <N where N = expected concurrent users
  - If >10x expected, subscription leak likely

**Detection:**
- Phase 1 testing: open dashboard, leave it for 5 minutes → memory usage increases constantly = likely subscription leak
- Supabase dashboard: Realtime concurrent connections =  50, but app has only 5 users = too many subscriptions
- Browser DevTools → Performance tab: flame chart shows `supabase.subscribe()` being called many times, `unsubscribe()` never called
- Load test: 10 users open dashboard → each opens/closes tabs → Realtime concurrent connections spike to 100+ = subscription leak

**Phase risk:** **Mid (Phase 2)** — Realtime features added after basic dashboard; subscription management must be designed in from start

---

## Top 5 Critical Risks (Highest Impact on Prototype)

Ranked by likelihood of causing Phase 1 failure or major rework:

| Rank | Pitfall | Impact | Prevention Phase |
|------|---------|--------|------------------|
| **1** | **Audit Trail Mutability** (Pitfall 2) | Regulatory rejection; system loses credibility. Requires schema redesign if not done in Phase 0. | Phase 0 (schema design) |
| **2** | **RLS Disabled by Default** (Pitfall 8) | Data breach; confidential board packs exposed. 170+ apps affected in 2025. Quick fix (enable RLS) but must be done immediately. | Phase 1 (schema setup) |
| **3** | **Hydration Mismatch** (Pitfall 7) | Dashboard components unresponsive; user thinks system is broken. Architectural issue; fix requires component refactoring. | Phase 1 (dashboard build) |
| **4** | **Cache Poisoning** (Pitfall 9) | User logs in as someone else. Regulatory catastrophe. Requires disabling caching on all auth pages. | Phase 1 (auth implementation) |
| **5** | **Risk Scoring Collapse** (Pitfall 1) | Dashboard shows "everything is medium risk"; defeats purpose of system. Requires recalibration of entire risk register if not prevented upfront. | Phase 1 (risk register population) |

---

## Phase-Specific Pitfall Summary

| Phase | Critical Pitfalls to Address | Avoid Early | Defer to Later |
|-------|------|---|---|
| **Phase 1** | Audit trail architecture, RLS enabled, hydration errors, cache settings, risk scoring rubric | Realtime subscriptions, complex reporting, multi-tenant scenarios | Advanced reporting formats, vendor risk module |
| **Phase 2** | UX validation, connection pooling, pagination performance, evidence file handling | Permission sprawl, custom reports | Cross-institution dashboards |
| **Phase 3** | Reporting formats, token refresh flows, data consistency | — | Advanced integrations |

---

## Testing Checklist for Pitfall Prevention

Before moving to next phase:

- [ ] **Audit Trail:** Query audit table directly; verify cannot be deleted/modified even by admin
- [ ] **RLS:** Run `SELECT tablename FROM pg_tables WHERE rowsecurity=false` → zero results
- [ ] **Hydration:** Next.js build succeeds; load dashboard in browser → no console errors about hydration
- [ ] **Auth Caching:** Open two browser windows, log in as different users simultaneously → verify each sees only own data
- [ ] **Risk Scoring:** Sample 10 risks; compare across 3 different assessors → variance <3 points per risk
- [ ] **Performance:** Dashboard load time <2 seconds with 1000 test risks; pagination works
- [ ] **Connection Pool:** Monitor Supabase connections during demo → never exceeds 30
- [ ] **Evidence Storage:** Upload PDF, wait 24h, download → file hash unchanged
- [ ] **UX:** Compliance officer uses system for 15 min without help → 80% task completion rate

---

## Sources

- [Diligent: GRC Guide](https://www.diligent.com/resources/guides/grc)
- [Sprinto: GRC Tools 2026](https://sprinto.com/blog/grc-tools/)
- [DFIN: Audit Trails](https://www.dfinsolutions.com/knowledge-hub/thought-leadership/knowledge-resources/audit-trails)
- [Agnitestudio: Tamper-Resistant Audit Trails](https://agnitestudio.com/blog/designing-tamper-resistant-audit-trails-compliance-systems/)
- [Pathlock: RBAC Guide](https://pathlock.com/blog/role-based-access-control-rbac/)
- [Next.js: Hydration Errors](https://nextjs.org/docs/messages/react-hydration-error)
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [ByteIota: Supabase RLS Security Flaw](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Supabase Auth Middleware: Handle Errors](https://www.iloveblogs.blog/post/handle-supabase-auth-errors-middleware)
- [Supabase Docs: Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Connection Pooling](https://needthisdone.com/blog/supabase-connection-pooling-production-nextjs/)
- [Daily Dev: Infinite Scroll](https://app.daily.dev/posts/implementing-pagination-and-infinite-scrolling-in-next-js-jpcclb3ox)
- [GainCompliance: Statutory Filing Errors](https://gaincompliance.com/statutory-filing-errors/)
- [Timus Consulting: GRC UX](https://timusconsulting.com/compliance-made-simple-the-power-of-ui-ux/)
- [SafetyCulture: 5x5 Risk Matrix](https://safetyculture.com/topics/risk-assessment/5x5-risk-matrix)
- [Initia Risk: Risk Matrix Limits](https://initiarisk.com/resources/risk-matrix-5x5-explained)
- [Supabase: Database Connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [GitHub: Race Conditions with SERIALIZABLE](https://github.com/orgs/supabase/discussions/30334)
