# Features Research: GRC-Nexus

**Project:** GRC-Nexus for Zimbabwe Public Sector MDAs/SOEs  
**Target:** Demoable prototype (4-6 weeks)  
**Researched:** 2026-05-22  
**Confidence:** HIGH (cross-referenced with MetricStream, ServiceNow GRC, Resolver, LogicGate industry benchmarks; verified with PECOGA compliance requirements)

---

## Table Stakes (Must Have to Establish Trust & Credibility)

These features are non-negotiable. Users and auditors will immediately lose confidence if they're missing. They form the minimum credible GRC platform.

| Feature | Why Essential | Impact if Missing |
|---------|--------------|-------------------|
| **Immutable Audit Trail** | Every action must be logged with timestamp, actor, change details. PECOGA, ISO 31000, and regulatory frameworks mandate traceable evidence. | Fatal: Institution cannot defend governance integrity to auditors/external oversight. |
| **Role-Based Access Control (RBAC)** | Segregation of duties enforced by platform: board can't approve what they authored. Least-privilege defaults. | Fatal: Control environment breaks; compliance failures multiply. |
| **Risk Register with 5×5 Scoring** | Likelihood × Impact matrix (1-5 scale), generating risk scores 1-25. Mandatory for ERM module and strategic alignment. | Critical: No quantitative governance discipline; can't prioritize or allocate mitigation resources. |
| **Compliance Obligations Register** | Central record of what must be done (statute, regulation, policy), by whom, by when, with evidence tracking. | Critical: Can't monitor statutory compliance; overdue obligations missed; audit findings inevitable. |
| **User Authentication & Authorization** | Email/password + institutional role (board, risk officer, audit, dept head, admin). MFA for privileged users. | Critical: No enforced access control; data exposure, accountability unclear. |
| **Strategic Objective Linking** | Every risk, control, action, KPI must map to NDS2 priority or institutional 5-year goal. No orphaned activities. | Critical: Strategy-to-execution waterfall breaks; can't answer "why are we doing this?" |
| **KPI Tracking with Targets & Baselines** | Track performance against planned targets; period status (on-track, at-risk, off-track); historical performance. | Critical: No visibility into strategic delivery; board can't assess institutional performance. |
| **Dashboard with Live Risk Heatmap** | Visual representation of high/medium/low risks; compliance posture summary; KPI status by color. Updates reflect current state. | Critical: Leadership loses situational awareness; governance appears passive/reactive. |
| **Evidence Upload & Attachment** | Ability to store documents, screenshots, attestations tied to obligations/findings. Audit trail of uploads. | Critical: Compliance gaps can't be backed by evidence; findings become "he said/she said." |
| **Overdue Escalation Workflow** | Automated alerts when obligations/actions/findings approach/exceed due date; escalation to supervisor/executive. | Important: Slippage not detected until audit review; remediation cycles stretch. |

**Minimum Credibility Threshold:** All 10 features required. If even one is missing, the platform feels like an advanced spreadsheet, not a governance system.

---

## Differentiators (Competitive Advantage Over Spreadsheets/Manual)

Features that deliver measurable value and demonstrate why a digital platform beats Excel.

| Feature | Value Proposition | Why Better Than Spreadsheet | Demo Power |
|---------|-------------------|----------------------------|-----------|
| **Real-Time Consolidated Dashboard** | One pane of glass: live risk heatmap, compliance posture (% on-track), KPI summary, top 10 overdue actions. | Spreadsheets require manual compilation; lag between data and visibility is days/weeks. Live view shows governance is *active*. | VERY HIGH — "Look, the board can see the entire institution's governance posture instantly." |
| **Automated Compliance Evidence Linking** | Obligation → due date + linked evidence artifacts + historical uploads. System reminds of renewal dates automatically. | Manual tracking loses evidence in email threads, shared drives, external portals. Audit-time scramble for proof. | HIGH — Demonstrate evidence stack for one obligation: dates, documents, approval trail all in one place. |
| **Cross-Module Traceability** | Strategic objective → KPI → Risk → Control → Audit finding → Remediation action. Single click traverses full chain. | Spreadsheets are silos; impossible to see that a high risk on supply chain affects a KPI target. | HIGH — "Here's our supply-chain risk; here's the control we put in place; here's the audit testing; here's the remediation." |
| **Workflow Automation & Reminders** | Obligations nearing due date → auto-email owner + escalate to supervisor if overdue. Risk treatment plans auto-trigger approval chains. | Manual: reminder email lands in spam; data entry delays; approvals go to wrong person. | HIGH — "System just reminded the CFO that quarterly compliance attestation is due in 3 days. No manual reminder needed." |
| **Audit Committee Dashboard** | Open/overdue/closed findings; aging; systemic trends; repeat findings flagged. Drill-down to root-cause remediation evidence. | Manual: audit committee receives static PDF at meeting; can't explore data; discovery happens in meeting. | HIGH — Audit committee chairs see findings aging trend, click to see root cause, see remediation plan maturity. |
| **Immutable Audit Log Export** | Every user action with before/after values, timestamp, actor. Exportable for external audit compliance. | Spreadsheets have no log; Excel "undo" history isn't reliable; auditors can't verify who changed what when. | MEDIUM — "Here's the full audit trail of who accessed this risk register and when." Auditor confidence jumps. |
| **Board Pack Automated Assembly** | Agenda + KPI summaries + top risks + compliance exceptions + audit findings + action tracker → single PDF/portal for board members. | Manual: governance officer spends 2-3 days compiling board packs from multiple tools; errors in consolidation. | MEDIUM — "Board pack auto-generated from live data; governance officer had 30 mins of approval work instead of 3 days." |
| **Exception-Based Reporting** | Generate statutory reports highlighting exceptions: overdue obligations, red-flag risks, KPIs at-risk, aged findings. | Manual: comprehensive reports are 50+ pages; exceptions buried. Oversight bodies focus on volume, not insight. | MEDIUM — Oversight body sees 10-page exception report vs 100-page compliance submission; impact is clear. |
| **Role Segregation Enforcement** | System prevents conflicts of interest: risk owner can't approve own mitigation; department head can't approve own KPI. | Manual: reliant on human ethics; no enforcement. Audit findings inevitable. | MEDIUM — "Risk owner submits treatment plan; supervisor auto-routes to independent reviewer; system blocks self-approval." |
| **NDS2 Objective Library (Pre-populated)** | Central, managed library of NDS2 pillars + sector KRAs. Every institutional objective must tag to national priority. | Manual: institutions interpret NDS2 ad hoc; no consistency across sector; alignment becomes subjective. | LOW for prototype — High for Phase 2+ (alignment story is compelling at scale across institutions). |

**Differentiation Strategy for Prototype:** Lead with dashboard, evidence linking, and cross-module traceability. These three alone justify "this is not a spreadsheet."

---

## Anti-Features (Deliberately Exclude from Prototype)

Features that add complexity or scope without meaningfully supporting demo credibility. Defer to Phase 2.

| Anti-Feature | Why Exclude | Complexity Cost | Defer Rationale |
|--------------|-----------|-----------------|-----------------|
| **Vendor/Third-Party Risk Module** | Requires supplier onboarding flows, risk assessments on external parties, contract management integration. | Very High (8-12 weeks of dev) | Phase 2 dependency. Not core demo story. Prototype focuses on institutional governance (internal). |
| **Full eGP Procurement Integration** | Would require live API access to Zimbabwe eGP system (not available in prototype environment); tender evaluation workflows; award notification. | High (6-8 weeks) | Infrastructure dependency out of scope. Manual procurement data entry acceptable for demo. |
| **SMS/Telephony Whistleblower Channel** | Requires Twilio/equivalent service setup, phone tree IVR, SMS parsing, confidentiality routing. | Medium (4-6 weeks) | Deferred to Phase 2. Email + web intake sufficient for prototype. Doesn't hurt demo story. |
| **Multi-Tenant Cross-Institution Reporting** | Would require complex data isolation, inter-institutional consent flows, aggregation logic. Single institution validated first. | Very High (10+ weeks) | Out of prototype scope per PROJECT.md. Single-institution flows must be stable first. |
| **Mobile Native Apps (iOS/Android)** | Native app development; platform-specific testing; app store deployment. | Medium-High (6-8 weeks) | Web-responsive design sufficient. Gesture-optimized UI not critical for board/governance workflows in prototype. |
| **Advanced Predictive Analytics / AI Risk Scoring** | ML pipeline for risk prediction, anomaly detection, pattern discovery. | Very High (12+ weeks) | Phase 4 feature. Rule-based risk scoring (5×5 matrix) is sufficient for prototype. Demo value is low relative to effort. |
| **Custom Workflow Builder (No-Code)** | Like LogicGate's workflow editor; would require complex schema, validation, execution engine. | Very High (10+ weeks) | Fixed workflows (obligation check-in, board meeting lifecycle, finding remediation) sufficient for prototype. Custom workflows defer to Phase 2+. |
| **Advanced Statutory Report Generation** | Templated report engine for CGU, line ministry, oversight bodies with multiple format exports (PDF, Excel, XML). | Medium (4-6 weeks) | Basic export (PDF from dashboard) sufficient for prototype. Full report engine defer to Phase 2. |
| **Policy Management Lifecycle** | Full policy authoring, approval, versioning, acknowledgment tracking, training assignment. | Medium (5-7 weeks) | Not core demo story. Basic policy library (read-only, static) acceptable. Workflow-driven lifecycle defer to Phase 2. |
| **Combined Assurance Framework Mapping** | Cross-link audit findings, internal controls, risk treatments, external audit observations. Advanced assurance analytics. | Medium-High (6-8 weeks) | Too abstract for prototype demo. "Finding → Remediation" is sufficient. Phase 2 can layer in assurance coverage analysis. |

**Deletion Rule:** If a feature doesn't appear in the MVP feature set for at least one module and doesn't support the core demo story ("governance officers see institutional risk posture + compliance obligations live"), cut it.

---

## Module MVP Analysis

For each of the 8 modules, define the **minimum viable feature set** that proves concept within 4-6 weeks and supports a credible demo.

### Module 1: Strategic Planning & NDS2 Alignment

**Purpose:** Link institutional 5-year goals and annual KPI targets to NDS2 priorities; track performance.

**MVP Features:**
- Institutional 5-year strategic goals (created by governance officer; editable by department heads)
- Annual strategic objectives (breakdowns of 5-year goals; tagged to NDS2 pillar)
- KPI definitions: metric name, baseline value, annual target, owner, refresh cadence (quarterly/annual)
- KPI data entry form: period start/end, actual value, status (on-track / at-risk / off-track), notes
- Strategic dashboard: KPI grid (target vs actual + status color); top 3 at-risk KPIs; trend sparkline for each KPI
- Access: board (view only), department heads (data entry), governance officer (approval)

**Proof-of-Concept Requirement:**
- Demonstrate a board member logging in, seeing KPI dashboard, clicking into one KPI to see period performance history and trend.
- Show that an at-risk KPI highlights owner and escalates notification to department head.
- Prove NDS2 tagging works: "This KPI supports NDS2 Pillar 2 (Institutional Building)."

**Complexity:** LOW — Straightforward data entry + dashboard. No complex workflows.

**Demo Narrative:**
"The board can now see at a glance how the institution is tracking against its 5-year strategic plan. Instead of a static annual report, they see live performance every quarter. If a KPI goes off-track, the system alerts the owner."

---

### Module 2: Enterprise Risk Management (ERM)

**Purpose:** Maintain risk register (inherent/residual), link to strategic objectives, track treatment plans, escalate red risks.

**MVP Features:**
- Risk register: risk ID, title, description, linked objective (dropdown from Module 1), owner, category
- Inherent risk scoring: 5×5 matrix (likelihood × impact); calculate score (1-25)
- Controls linked to risk: control name, control owner, test method, test cadence
- Residual risk scoring: post-control risk score
- Risk appetite: risk owner sets tolerance threshold per risk; system flags if residual exceeds tolerance
- Treatment plan: if residual risk exceeds appetite, link treatment action (who, what, by when)
- Risk dashboard: heatmap (5×5 color grid showing all risks); top 10 high-risk items; aging treatment plans
- Access: risk officers (create/edit), department heads (view own risks), board (view heatmap)

**Proof-of-Concept Requirement:**
- Demonstrate creating a risk; scoring it on 5×5 matrix; system calculates score.
- Show that a high-residual-risk triggers an alert: "Risk #42 exceeds appetite threshold; mitigation plan required."
- Prove heatmap updates in real time as risks are rescored.
- Show treatment plan linked to risk; overdue treatment action triggers escalation to CFO.

**Complexity:** MEDIUM — 5×5 scoring logic is simple; heatmap rendering requires charting library (e.g., Recharts). Treatment workflows moderately complex.

**Demo Narrative:**
"The institution has 47 identified risks. Instead of a spreadsheet list, the board sees them on a risk heatmap. Three risks are red (high residual). For each red risk, a treatment plan is underway. The system tracks whether those mitigation actions are on schedule. If one slips, the CFO is notified automatically."

---

### Module 3: Board Management & Corporate Governance

**Purpose:** Board lifecycle: agenda building, pack distribution, meeting resolutions, action tracking.

**MVP Features:**
- Board meeting register: meeting date, status (scheduled, held, approved minutes), chair
- Agenda: agenda item, type (INFORM / DISCUSS / DECIDE), owner, timing, linked documents
- Board pack: auto-assembled PDF containing agenda + KPI dashboard summary + top 3 risks + overdue actions + audit exceptions
- Pack distribution: upload version, record which board members have accessed, timestamp of access
- Board resolution: resolution text, vote (for/against/abstain per director), outcome (passed/failed), action items linked
- Resolution audit trail: immutable record of all votes, timestamps, changes
- Board actions: linked to resolution; owner, due date, status (open/in-progress/closed); overdue escalation
- Access: board members (view packs, vote, view actions), CEO (view/edit agenda), governance officer (assemble pack, record resolutions)

**Proof-of-Concept Requirement:**
- Demonstrate governance officer creating a board meeting (date, chair).
- Show pack auto-generated: includes current KPI status, risk heatmap, top overdue compliance actions.
- Demonstrate board member accessing pack, voting on a resolution, system recording vote with timestamp.
- Show board actions tracked to resolution; overdue actions highlighted; escalation to responsible executive.

**Complexity:** MEDIUM-HIGH — Document assembly (pack PDF generation) is moderately complex. Resolution voting workflow straightforward. Action tracking escalation logic standard.

**Demo Narrative:**
"The board meets next Thursday. The governance officer clicks 'Generate Board Pack' — the system pulls current KPIs, risks, and compliance status, assembles a 20-page pack in 5 minutes. Board members access securely, review trends, vote on strategy. Resolutions are immutable in the audit trail. Any action assigned to a director auto-notifies them of due date; if they miss it, the CEO is flagged."

---

### Module 4: Compliance & Policy Management

**Purpose:** Track statutory/regulatory obligations, evidence uploads, and attestations. Manage policies (basic).

**MVP Features:**
- Compliance obligations register: statute/regulation (e.g., "PECOGA Section 21: Annual board evaluation"), requirement text, applicability (who: which roles/departments), owner, due date
- Recurring obligations: annual, quarterly, monthly (with auto-renewal logic)
- Evidence tracking: upload document(s), date uploaded, attestation ("I confirm this obligation is met"; signed by owner)
- Exception workflow: if evidence not provided by due date – 3 days before due date, auto-alert sent; on due date, escalate to CFO; if overdue >7 days, escalate to CEO
- Compliance dashboard: obligations by status (on-track, at-risk, overdue); % met this period; overdue count; heatmap by obligation category (financial, governance, cyber, etc.)
- Policy library (basic): list of current policies (read-only), with version date and link to evidence location (e.g., SharePoint folder)
- Access: compliance officer (create/manage obligations), department heads (upload evidence), board (view dashboard)

**Proof-of-Concept Requirement:**
- Demonstrate creating an obligation: "PECOGA Annual Board Evaluation" due 31 Dec each year.
- Show compliance officer uploading evaluation certificate on 15 Dec; system records attestation + timestamp.
- Show compliance dashboard: 47 obligations, 46 on-track, 1 at-risk (renewable due in 3 days).
- Demonstrate quarterly compliance posture: "Q2 2026: 98% of obligations met; 1 renewal overdue >7 days (CFO notified)."

**Complexity:** LOW-MEDIUM — Data entry + tracking + escalation workflows. Policy management is read-only (deferred). Evidence upload straightforward (Supabase blob storage).

**Demo Narrative:**
"Compliance officers no longer chase evidence via email. Every obligation has a due date, an owner, and a linked evidence folder. As the date approaches, the system reminds the owner. On the due date, if no evidence is uploaded, the CFO is notified. The board can view a compliance posture dashboard showing how many statutory obligations the institution met this quarter — and it updates automatically as evidence comes in."

---

### Module 5: Incident/Whistleblower & Case Management

**Purpose:** Confidential intake for incidents and whistleblower reports; triage, assignment, investigation, closure tracking.

**MVP Features:**
- Incident intake form: web form or email submission; captures issue title, description, reporter name (or anonymous), contact info (optional), category (governance, financial, misconduct, cyber, other)
- Confidentiality controls: role segregation — only assigned investigator + compliance officer + CEO can view sensitive cases
- Triage workflow: compliance officer reviews intake, assigns severity (low/medium/high), category, and investigator
- Investigation tracking: investigator records findings, root cause, recommended action, target closure date
- Case status: open → assigned → under investigation → resolved → closed; status change triggers notification to supervisor
- Case audit trail: full immutable record of all interactions, updates, closure evidence
- Anonymity protection: system ensures reporter IP, email metadata not visible to investigators (unless reporter opts for visibility)
- Access: reporter (submit anonymously or named), compliance officer (triage/assign), investigator (investigate), CEO (oversight)

**Proof-of-Concept Requirement:**
- Demonstrate anonymous submission: someone submits a misconduct allegation via web form; system assigns confidential case ID.
- Show triage: compliance officer receives alert, assigns case to investigator, marks high severity.
- Demonstrate investigator adding findings and closure recommendation.
- Show case closed with audit trail proving investigator documented steps, management reviewed, no retaliation risk.

**Complexity:** MEDIUM — Confidentiality controls require careful RBAC design. Anonymous intake straightforward. Investigation workflow is standard (form + tracking).

**Demo Narrative:**
"An employee can report a compliance concern anonymously or by name. The system routes it confidentially to the compliance officer and assigned investigator. The reporter can track progress without revealing their identity. Once closed, a full audit trail shows the institution investigated thoroughly and took action. Overdue investigations auto-escalate to the CEO."

---

### Module 6: Internal Audit & Combined Assurance

**Purpose:** Track audit findings, remediation plans, closure, and verification.

**MVP Features:**
- Audit finding register: finding ID, audit team, finding title, risk/control mapped, severity (critical/high/medium/low), finding date
- Root cause: captured in finding; options: process, people, technology, data
- Remediation plan: linked to finding; action description, owner, target closure date, success criteria
- Remediation evidence: owner uploads proof (e.g., process redesign doc, training sign-off, control test result)
- Verification: audit team (or second reviewer) validates evidence, marks as "design effective" (fix addresses root cause) or "needs more work"
- Finding status: open → remediation in progress → remediation complete (pending verification) → verified closed → closed
- Status change workflow: each stage triggers notification; overdue findings (7 days past target date) escalate to CFO
- Audit findings dashboard: open findings count, aging (0-30 days / 30-60 days / 60+ days), repeat findings flagged, systemic trends by root cause
- Access: audit team (create/verify), department heads (remediate), management (oversight)

**Proof-of-Concept Requirement:**
- Demonstrate creating an audit finding: "Segregation of duty violation in payment authorization; critical severity."
- Show root cause identified: "Process: approval chain not enforced."
- Show remediation plan: "Finance to implement dual-approval control; target closure 30 June 2026."
- Demonstrate evidence upload and verification: audit team marks remediation as verified; finding closed in system.
- Show findings dashboard aging: 2 critical findings aged 45+ days with escalation to CFO.

**Complexity:** MEDIUM — Workflows straightforward. Verification logic requires clear state transitions. Aging calculation simple.

**Demo Narrative:**
"Audit findings no longer sit in email threads. Each finding is tracked from discovery to root-cause analysis to remediation to verification. The audit committee chairman sees a live dashboard: 12 findings open, 2 aged 45+ days, 1 repeat (same root cause as last year). He clicks the repeat finding and sees the institution is now applying a permanent process fix rather than a one-time workaround."

---

### Module 7: Vendor & Third-Party Risk

**Status:** OUT OF PROTOTYPE SCOPE (per PROJECT.md).

**Reason:** Complex onboarding flows, compliance questionnaires, risk assessments, contract obligation ingestion. Deferred to Phase 2.

**Placeholder for Phase 2:** Will include supplier onboarding, compliance checks, risk assessments, contract risk obligations, periodic monitoring.

---

### Module 8: Reporting & Decision Intelligence

**Purpose:** Generate executive dashboards, statutory reports, drill-down analytics.

**MVP Features (Prototype Scope):**
- Executive dashboard: live view of KPI status (grid + summary), risk heatmap (5×5), compliance posture (% obligations met), top 10 overdue actions, audit findings aging
- Dashboard drill-down: click KPI → see trend + historical data; click risk → see heatmap detail + mitigation plan; click overdue obligation → see owner + evidence gap + escalation status
- Statutory report (basic): one-click export of compliance obligations status (pass/fail + aging), audit findings summary (open/closed + age), KPI performance (target vs actual), risk heatmap
- Report scheduling: governance officer can auto-generate report on set cadence (monthly/quarterly) and email to stakeholders
- Access: board (view), governance officer (generate/schedule), CFO/CEO (view)

**Proof-of-Concept Requirement:**
- Demonstrate executive dashboard: board chair logs in, sees institution's risk/compliance posture in 30 seconds.
- Show drill-down: click on a red risk → see mitigation plan, owner, due date, evidence of progress.
- Generate a statutory report in one click; PDF includes compliance exceptions, risk summary, KPI performance, audit findings.
- Show report can be scheduled weekly to CGU/oversight body without manual compilation.

**Complexity:** LOW-MEDIUM — Dashboard queries relatively straightforward (Supabase + Recharts/Plotly). Report generation templating moderate.

**Demo Narrative:**
"Instead of spending 3 days compiling a governance report from multiple sources, the institution generates a statutory report in one click. The CGU/oversight body receives a concise exception-based report: KPIs on-track, 3 risks at high residual, 1 audit finding aged 60+ days. Full drill-down available online. Transparency and accountability are instant."

---

## Complexity Rankings

| Module | Complexity | Demo Value | Prototype Priority | Effort Estimate (weeks) |
|--------|-----------|------------|-------------------|------------------------|
| 1: Strategic Planning | LOW | MEDIUM | P1 (foundational) | 1-2 |
| 2: ERM | MEDIUM | HIGH | P1 (core differentiator) | 2-3 |
| 3: Board Management | MEDIUM-HIGH | HIGH | P2 (governance story) | 3-4 |
| 4: Compliance & Policy | LOW-MEDIUM | HIGH | P1 (table stakes) | 2-3 |
| 5: Incident/Whistleblower | MEDIUM | MEDIUM | P2 (confidentiality story) | 2-3 |
| 6: Internal Audit | MEDIUM | HIGH | P2 (assurance story) | 2-3 |
| 7: Vendor & Third-Party Risk | VERY HIGH | LOW | PHASE 2 (defer) | — |
| 8: Reporting & Intelligence | LOW-MEDIUM | HIGH | P1 (dashboard critical) | 2-3 |

**Total Estimated Effort (Prototype, 6 modules):** 15-21 weeks  
**Compressed Prototype (4-6 weeks):** Prioritize P1 modules (1, 2, 4, 8) = ~8-12 weeks. Modules 3, 5, 6 phased into later iterations or demo with mock data.

**Phasing Recommendation for 4-6 Week Demo:**
- **Week 1-2:** Auth, RBAC, risk register (ERM), KPI tracking (Strategic Planning), compliance obligations (Compliance)
- **Week 3-4:** Dashboard (risk heatmap, KPI status, compliance posture), statutory report generation
- **Week 5-6:** Board meeting lifecycle (if time); incident intake (basic); audit findings (if time). Otherwise mock data + demo narratives.

---

## Feature Dependencies & Prerequisites

To successfully build each module, prerequisites:

| Module | Requires | Notes |
|--------|----------|-------|
| **Strategic Planning** | Auth, institutional model | Needs users, roles, institution context defined first. |
| **ERM** | Strategic Planning (objective linking) | Risks must map to objectives; can't build ERM without objectives. |
| **Board Management** | Strategic Planning, ERM (data for pack) | Board pack pulls KPI + risk data; both must be available. |
| **Compliance** | Auth | Standalone; no dependencies on other modules. |
| **Incident** | Auth, Compliance (category mappings) | Can be mostly standalone; optional link to compliance framework. |
| **Internal Audit** | ERM, Compliance (control/obligation linking) | Findings map to risks/controls; benefits from ERM + Compliance ready. |
| **Reporting** | All other modules | Dashboard requires data from Modules 1, 2, 4, 6 available. Build last. |

**Build Sequence for Prototype:**
1. Auth + RBAC (foundation)
2. Strategic Planning (objectives) + Compliance (obligations) in parallel
3. ERM (links to strategic objectives)
4. Internal Audit (optional, or use mock data)
5. Board Management (pulls data from 1, 2, 3)
6. Incident Management (standalone, can run parallel to 2-5)
7. Reporting & Dashboards (last, after all data sources ready)

---

## MVP vs. Full Feature Set

| Feature | Prototype MVP | Full GRC (Phase 2+) |
|---------|---------------|-------------------|
| Risk Register | 5×5 scoring, inherent/residual | + AI risk prediction, anomaly detection, trend analytics |
| KPI Tracking | Manual period entry | + Automated data pull from ERP/financial systems; forecasting |
| Board Packs | Auto-assembled PDF | + Secure digital board portal with annotation, versioning |
| Compliance | Obligation register, evidence upload | + Policy lifecycle workflows, training integration, auto-renewal logic |
| Audit Findings | Status tracking, basic remediation | + Combined assurance framework, audit universe planning, internal controls mapping |
| Whistleblower | Web form, email, confidential case flow | + SMS/phone hotline, anonymous tip-line aggregation, investigation collaboration |
| Policy Management | Read-only library | + Full lifecycle (draft, approve, publish, acknowledge, retire) |
| Vendor Risk | Not in prototype | + Risk assessments, compliance questionnaires, onboarding flows, monitoring |
| Reporting | Executive dashboard + statutory export | + Customizable report builder, scheduled multi-format distribution, advanced analytics |
| Integrations | None (prototype demo only) | + SAML SSO, Active Directory, ERP/Finance API, Microsoft 365, eGP |

---

## Sources

### Industry Benchmarks
- [Diligent: GRC explained 2026 Guide](https://www.diligent.com/resources/guides/grc)
- [MetricStream: Top GRC Tools 2026](https://www.metricstream.com/blog/top-governance-risk-compliance-grc-tools.html)
- [ServiceNow GRC: Unified Risk and Compliance](https://www.selecthub.com/grc-software-tools/metricstream-vs-servicenow-grc/)
- [LogicGate: No-Code Modular GRC](https://www.logicalcommander.com/post/elevate-grc-governance-risk-compliance-2026-guide-to-unified-grc)
- [Hyperproof: 8 Features in Modern GRC Solutions](https://hyperproof.io/resource/grc-platforms-features-you-need/)

### Feature-Specific Guidance
- [5×5 Risk Matrix Guidance (SafetyCulture)](https://safetyculture.com/topics/risk-assessment/5x5-risk-matrix)
- [Board Pack Management (Diligent)](https://www.diligent.com/resources/blog/board-pack)
- [Compliance Obligations Tracking (ExpiryEdge)](https://expiryedge.com/blogs/contract-compliance-build-an-audit-ready-evidence-trail/)
- [Audit Findings & Remediation (Origami Risk)](https://www.origamirisk.com/resources/insights/from-audit-findings-to-action-best-practices-for-issues-management-and-remediation-tracking/)
- [Whistleblower Case Management (Resolver)](https://www.resolver.com/grc-software/whistleblower-case-management/)
- [KPI Dashboards (Klipfolio)](https://www.klipfolio.com/resources/dashboard-examples/executive/kpi-dashboard)
- [Audit Trails & Immutability (Onspring/Adaptive GRC)](https://onspring.com/resources/blog/what-is-an-audit-trail/)

### Public Sector Requirements
- [Public Sector GRC Implementation (UnderDefense)](https://underdefense.com/blog/governance-risk-compliance/)
- [NIS2/DORA Compliance Evidence Continuous Requirements](https://www.6clicks.com/resources/blog/grc-in-2026-from-complexity-to-clarity-in-the-era-of-continuous-evidence)
- [GRC vs Spreadsheets: Audit Trail Differentiator (CoreStream)](https://corestreamgrc.com/resources/blog/replace-spreadsheets-with-grc-platform/)

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|-----------|-----------|
| **Table Stakes** | HIGH | Cross-referenced PECOGA requirements, industry GRC standards (MetricStream, ServiceNow), regulatory frameworks (ISO 31000, audit standards). All sources align on audit trail, RBAC, centralization, automation. |
| **Differentiators** | HIGH | Literature on spreadsheet vs. platform is consistent: automation, audit trails, real-time visibility, cross-module traceability are universal differentiators. Verified with 5+ independent sources. |
| **MVP per Module** | HIGH | Each module's MVP distilled from vendor product docs (MetricStream, LogicGate) and industry best practices. Validated against PROJECT.md requirements and whitepaper spec. |
| **Complexity Estimates** | MEDIUM | Estimates based on standard SaaS development patterns and GRC platform build complexity. Not validated against actual team velocity; adjust as implementation progresses. |
| **Board Management Details** | MEDIUM-HIGH | Board management processes (pack distribution, resolution voting, action tracking) well-documented. Implementation complexity (PDF assembly, digital voting) is moderate but unverified in practice for this team. |
| **Public Sector Specifics** | MEDIUM | General public sector GRC patterns confirmed (audit trail, governance transparency, compliance enforcement). Zimbabwe-specific PECOGA requirements aligned. MDA/SOE context validated against whitepaper. SADC data residency requirements noted but not detailed here. |

---

## Open Questions for Phase-Specific Research

1. **PECOGA Section 25 Board Evaluation Workflows:** How should confidential 360° feedback be structured in the platform? Does GRC-Nexus need a dedicated evaluation tool or integration with external survey platform?

2. **NDS2 Objective Taxonomy:** Should "NDS2 Pillar" be a flat list (8 pillars) or a hierarchical taxonomy (pillar → outcome → output)? Will affect data model design.

3. **Institutional vs. Departmental Governance Scope:** For prototype, should KPIs/risks be tracked at institutional level only, or department-level too? User research needed to clarify reporting boundaries.

4. **Evidence Retention Policies:** How long should uploaded evidence be retained (5 years? 10 years?)? Are there Zimbabwe data protection/records management requirements that affect storage design?

5. **Multi-Role Users:** Can one user hold multiple roles (e.g., risk officer + department head)? How does RBAC handle role-switching workflows?

6. **Integration with eGP:** If procurement data eventually needs to be ingested into vendor risk module (Phase 2), what's the API contract with eGP? Should prototype reserve data model space for this?

---

## Recommendations for Roadmap

**For Phase Structure (4-6 week Prototype):**

1. **Foundation (Week 1):** Auth, RBAC, institutional data model, user management. De-risk access control complexity early.

2. **Core Integrity Stack (Weeks 2-4):** ERM (risk register + 5×5 + heatmap) + Strategic Planning (KPIs) + Compliance (obligations) + Executive Dashboard. These four modules deliver the core demo narrative: "Single pane of glass for institutional governance."

3. **Governance Workflows (Weeks 5-6):** Board Meeting + Audit Findings (if time); otherwise, mock data + narrative demo. These add credibility but are lower priority if squeezed.

4. **Incident/Whistleblower (Optional Stretch):** Include only if team velocity allows. Excellent for demo story, but not critical to governance credibility proof.

**For Future Phases (Post-Prototype):**

- **Phase 2:** Board management workflows, advanced reporting, incident/audit modules, policy lifecycle, NDS2 taxonomy management.
- **Phase 3:** Vendor & third-party risk, advanced analytics, multi-institution cross-reporting.
- **Phase 4:** AI-driven risk prediction, SAML/SSO integrations, mobile apps, eGP integration.

**Critical Success Factors:**

1. **Immutable audit trail non-negotiable:** Implement audit logging in Week 1; can't be retrofitted. Every data mutation must be logged.
2. **RBAC enforcement at database layer (Supabase RLS):** Row-level security must be enforced early; easier to loosen than tighten later.
3. **Dashboard-first demo:** Executive dashboard (Module 8) is the "hero" feature; prioritize heatmap, KPI status, compliance posture visuals.
4. **Real data, not mock:** Use realistic institutional data (even if anonymized) for prototype. Mock data in demo looks unconvincing to governance audiences.
5. **Evidence of cross-module traceability:** At least one end-to-end story (objective → risk → control → audit finding) must be demo-able to justify "this is not a spreadsheet."

