# GRC-Nexus Roadmap



## Overview



**8 phases | 44 v1 requirements | Unified governance platform for Zimbabwe's public sector with immutable audit trail, risk heatmap, compliance tracking, and board oversight.**



This roadmap follows a dependency-driven build order: Foundation (auth + RLS + audit) â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Strategic Planning â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Risk Management â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Compliance â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Board Governance â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Internal Audit â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Incident Management â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Executive Reporting. Each phase delivers a complete, verifiable capability with observable success criteria.



---



## Phases



### Phase 1: Foundation â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ Authentication, RLS, and Audit Trail

**Goal:** Users can securely log in with institutional roles, and all governance data operations are immutably logged.

**Depends on:** None (first phase)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, TRAIL-01, TRAIL-02, TRAIL-03, TRAIL-04

**Success Criteria:**

1. User can create account with email/password and is assigned an institutional role (admin, board-member, ceo, risk-officer, audit-officer, or dept-head)

2. User can log in and remain authenticated across browser sessions without re-entering credentials

3. User can log out from any page and is immediately logged out everywhere

4. Privileged users (admin, board-member) are blocked from sensitive workflows without MFA enabled

5. Every governance action (create, update, delete) is recorded in an immutable audit log visible to admins and audit officers

6. Supabase Row-Level Security enforces access control at database layer, not only in application code

7. User can only see data belonging to their own institution; cross-institution queries are blocked at RLS layer

**UI hint**: yes

**Plans:** 5 plans

Plans:
- [x] 07-01-PLAN.md — Incident schema/RLS/trigger migrations + incident types + Zod schemas + utility contracts
- [x] 07-02-PLAN.md — Incident server actions + queries + escalation service + intake/escalate API routes
- [x] 07-03-PLAN.md — Intake UI (named/anonymous report form) + submission confirmation flow
- [x] 07-04-PLAN.md — Investigator dashboard/list/detail + triage assignment + status/closure workflow UI
- [x] 07-05-PLAN.md — Incident nav integration + end-to-end human verification checkpoint



---



### Phase 2: Strategic Planning â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ Objectives and KPIs

**Goal:** Governance officers can define institutional strategic objectives linked to national priorities and track KPI performance in real time.

**Depends on:** Phase 1 (auth, institutional context)

**Requirements:** STRAT-01, STRAT-02, STRAT-03, STRAT-04, STRAT-05, STRAT-06

**Success Criteria:**

1. Admin can create strategic objectives linked to NDS2 pillars or institutional 5-year goals with owner, start date, and target date

2. Each objective has a current status (On Track, At Risk, Off Track) visible in the management interface

3. Admin can create KPIs linked to an objective with baseline value, target value, unit of measure, and reporting frequency

4. KPI owners can record period readings (actual value, timestamp, notes) without deleting previous readings

5. System automatically calculates KPI performance status (On Track / At Risk / Off Track) based on actual vs. target progress

6. Dashboard displays a KPI summary grid showing all institution KPIs with color-coded status and trend indicators

**UI hint**: yes



---



### Phase 3: Enterprise Risk Management â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ Risk Register and Heatmap

**Goal:** Risk officers can create and score risks linked to strategic objectives, record mitigations, and see a live 5â”œÃ¢-5 risk heatmap.

**Depends on:** Phase 2 (strategic objectives provide risk context)

**Requirements:** RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, RISK-06, RISK-07, RISK-08

**Success Criteria:**

1. User can create a risk entry linked to a strategic objective with title, description, category, and owner

2. User can score a risk on a 5â”œÃ¢-5 likelihood-impact matrix (1â”œÃ³Î“Ã©Â¼Î“Ã‡Â£5 scale each dimension) for inherent risk

3. User can record residual risk score after applying mitigating controls and see the change reflected immediately

4. System calculates risk score (likelihood â”œÃ¢- impact) and applies severity labels (Low 1â”œÃ³Î“Ã©Â¼Î“Ã‡Â£4, Medium 5â”œÃ³Î“Ã©Â¼Î“Ã‡Â£9, High 10â”œÃ³Î“Ã©Â¼Î“Ã‡Â£15, Critical 16â”œÃ³Î“Ã©Â¼Î“Ã‡Â£25)

5. User can add risk treatments (mitigation actions) with owner, due date, and status; overdue treatments trigger escalation to owner and manager

6. Risk register is filterable by category, severity, owner, and status without page reload

7. Dashboard displays a live 5â”œÃ¢-5 risk heatmap showing all institutional risks positioned by inherent score with color-coded severity zones

**UI hint**: yes



---



### Phase 4: Compliance Management Î“Ã‡Ã¶ Obligations and Evidence Î“Â£Ã  COMPLETE
**Goal:** Compliance officers can track regulatory obligations with evidence uploads and attest to compliance status.
**Depends on:** Phase 1 (audit trail, institutional context)
**Requirements:** COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06
**Status:** Complete Î“Ã‡Ã¶ 2026-05-23
**Success Criteria:**
1. Admin can create compliance obligations linked to regulatory frameworks (PECOGA, PPDPA, NDS2, etc.) with due date and owner
2. Compliance officer can upload evidence files (PDF, DOCX, XLSX, images) and each receives an immutable filename (timestamp + SHA-256 hash); overwrites are prevented
3. Compliance officer can attest to an obligation's status (Compliant / Partially Compliant / Non-Compliant) with a digitally signed timestamp recorded in audit trail
4. Dashboard displays compliance posture: percentage of obligations met, count of overdue obligations, and obligations expiring within 30 days
5. Overdue obligations trigger automated escalation alerts at 3 days before due date, on due date, and at 7+ days overdue
6. Evidence file integrity is verified on download via SHA-256 checksum; system alerts if file has been modified
**UI hint**: yes
**Plans:** 6 plans

Plans:
- [x] 04-01-PLAN.md Î“Ã‡Ã¶ Database migrations (schema + RLS + triggers) + types + Zod schemas + utility functions + supabase db push
- [x] 04-02-PLAN.md Î“Ã‡Ã¶ Server Actions (createObligation, attestObligation, uploadEvidence) + query helpers + escalation service + escalate API route
- [x] 04-03-PLAN.md Î“Ã‡Ã¶ Evidence download Route Handler with SHA-256 integrity verification + next.config.mjs bodySizeLimit
- [x] 04-04-PLAN.md Î“Ã‡Ã¶ Compliance posture dashboard + obligations list + TanStack Table + create obligation form
- [x] 04-05-PLAN.md Î“Ã‡Ã¶ Obligation detail page + evidence upload form (browser SHA-256) + attestation form + EvidenceFileRow + AttestationRow
- [x] 04-06-PLAN.md Î“Ã‡Ã¶ Compliance nav item in sidebar + human verification of all Phase 4 workflows



---



### Phase 5: Board Management â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ Meetings and Resolutions

**Goal:** Board secretaries can manage meeting cycles, distribute packs, record resolutions, and track board action items.

**Depends on:** Phase 1 (institutional roles, audit trail)

**Requirements:** BOARD-01, BOARD-02, BOARD-03, BOARD-04, BOARD-05, BOARD-06

**Status:** Complete (2026-05-23)

**Success Criteria:**

1. Admin can create a board meeting with date, agenda items list, and attendee roster; meeting state transitions from Scheduled â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– In Progress â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Closed

2. Users can upload and attach board pack documents (minutes, financial reports, risk summaries, etc.) to meetings; documents remain visible even after meeting closes

3. Board members can record resolutions (motion text, proposer, seconder, vote outcome: Passed / Rejected / Tabled) with automatic timestamp and recording in immutable log

4. System tracks board action items derived from resolutions with assigned owner, due date, and status; action items are visible to all board members

5. Overdue board action items trigger escalation notifications to action owner and board secretary

  6. After board meeting is closed, all records (agenda, pack, resolutions, action items) become immutable; amendments to closed meetings are recorded as new audit entries only

**UI hint**: yes

**Plans:** 6/6 plans complete

Plans:
- [x] 05-01-PLAN.md — Database migrations (role extension + schema + RLS + triggers) + types + Zod schemas + board-utils + supabase db push
- [x] 05-02-PLAN.md — Server Actions + queries + escalation service + /api/board/escalate route
- [x] 05-03-PLAN.md — Board pack document download Route Handler with SHA-256 verification
- [x] 05-04-PLAN.md — Board dashboard (stats + upcoming meetings + overdue actions) reusing ComplianceStatCard
- [x] 05-05-PLAN.md — Meetings list + create/edit + detail tabs (Agenda/Documents/Resolutions/Actions) + all forms + upload + resolution + actions
- [x] 05-06-PLAN.md — Board nav integration (Gavel) + role badge updates + full human verification checkpoint


---




### Phase 6: Internal Audit â€” Findings and Remediation
**Goal:** Audit officers can log internal audit findings, assign remediation owners, and track closure evidence.
**Depends on:** Phase 3 (risk context for findings) or Phase 1 (institutional setup)
**Requirements:** AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05
**Success Criteria:**
1. Audit officer can create audit findings linked to a control, risk, or compliance obligation with severity (Minor / Moderate / Major / Critical), root cause description, and remediation owner assignment
2. Each finding records the audit review date, finding reference number, and narrative description in immutable audit log
3. Remediation owners can update finding status (Open â†’ In Progress â†’ Closed) and upload evidence files proving remediation; status changes trigger notifications
4. Dashboard displays audit finding summary: count of open findings by severity tier and count of overdue remediations requiring action
5. Overdue audit remediations trigger escalation notifications to remediation owner and audit officer
**UI hint**: yes
**Plans:** 5/5 plans complete

Plans:
- [x] 06-01-PLAN.md â€” Audit schema/RLS/trigger migrations + audit types + validation schemas + utility contracts
- [x] 06-02-PLAN.md â€” Server Actions + query helpers + escalation service + protected /api/audit/escalate route
- [x] 06-03-PLAN.md â€” Audit dashboard + findings list table + new finding form workflow
- [x] 06-04-PLAN.md â€” Finding detail + status update flow + remediation evidence upload UX
- [x] 06-05-PLAN.md â€” Audit nav integration + end-to-end human verification checkpoint

---



### Phase 7: Incident and Whistleblower Management â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ Reporting and Triage

**Goal:** Any user can submit confidential incident or whistleblower reports; investigators can triage, assign, and close cases with role-segregated visibility.

**Depends on:** Phase 1 (institutional roles, RLS, audit trail)

**Requirements:** INCD-01, INCD-02, INCD-03, INCD-04, INCD-05

**Success Criteria:**

1. Any user can submit an incident report (named or anonymous) via a web form with description, category (fraud, misconduct, safety, etc.), and optional contact method

2. Anonymous reports do not store submitter identity in any database table, including audit logs; anonymity is enforced at RLS and trigger layer

3. Incident cases are visible only to assigned investigators and admins; other users cannot see case list or details (RLS enforces role-segregated queries)

4. Investigators can triage new cases (status: New â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Assigned â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– In Investigation â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Escalated â”œÃ³Î“Ã‡Ã¡Î“Ã‡Ã– Closed) and reassign cases to other investigators without losing history

5. Case closure requires a resolution summary (findings, actions taken, lessons learned) and is logged as an immutable record; open cases cannot be marked closed without narrative

**UI hint**: yes



---



### Phase 8: Executive Dashboard and Reporting â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ Unified Governance View

**Goal:** Governance officers and executives can view consolidated governance posture (risk, KPI, compliance, actions) and generate statutory reports.

**Depends on:** Phase 2 (KPIs), Phase 3 (risk heatmap), Phase 4 (compliance posture)

**Requirements:** RPT-01, RPT-02, RPT-03, RPT-04

**Success Criteria:**

1. Executive dashboard displays a unified consolidated view with KPI summary grid, 5â”œÃ¢-5 risk heatmap, compliance posture card (% met, overdue count, expiring 30-days), and top 10 overdue governance actions

2. Users can filter all dashboard views by time period (date range), department, and module without page reload; filters persist in URL

3. System can generate a governance summary report as a PDF containing risk heatmap visualization, KPI performance table, compliance status summary, and board action tracking table; PDF is downloadable from dashboard

4. Admin and audit officers can view and filter the complete audit trail (all governance events: creates, updates, deletes, attest actions, role changes) with actor name, timestamp, table, action type, and affected record ID; export as CSV

**UI hint**: yes



---



## Requirement Coverage



| REQ-ID | Category | Phase | Status |

|--------|----------|-------|--------|

| AUTH-01 | Authentication & Access Control | Phase 1 | Pending |

| AUTH-02 | Authentication & Access Control | Phase 1 | Pending |

| AUTH-03 | Authentication & Access Control | Phase 1 | Pending |

| AUTH-04 | Authentication & Access Control | Phase 1 | Pending |

| AUTH-05 | Authentication & Access Control | Phase 1 | Pending |

| AUTH-06 | Authentication & Access Control | Phase 1 | Pending |

| AUTH-07 | Authentication & Access Control | Phase 1 | Pending |

| AUTH-08 | Authentication & Access Control | Phase 1 | Pending |

| STRAT-01 | Strategic Planning & KPIs | Phase 2 | Pending |

| STRAT-02 | Strategic Planning & KPIs | Phase 2 | Pending |

| STRAT-03 | Strategic Planning & KPIs | Phase 2 | Pending |

| STRAT-04 | Strategic Planning & KPIs | Phase 2 | Pending |

| STRAT-05 | Strategic Planning & KPIs | Phase 2 | Pending |

| STRAT-06 | Strategic Planning & KPIs | Phase 2 | Pending |

| RISK-01 | Enterprise Risk Management | Phase 3 | Pending |

| RISK-02 | Enterprise Risk Management | Phase 3 | Pending |

| RISK-03 | Enterprise Risk Management | Phase 3 | Pending |

| RISK-04 | Enterprise Risk Management | Phase 3 | Pending |

| RISK-05 | Enterprise Risk Management | Phase 3 | Pending |

| RISK-06 | Enterprise Risk Management | Phase 3 | Pending |

| RISK-07 | Enterprise Risk Management | Phase 3 | Pending |

| RISK-08 | Enterprise Risk Management | Phase 3 | Pending |

| COMP-01 | Compliance & Policy Management | Phase 4 | Pending |

| COMP-02 | Compliance & Policy Management | Phase 4 | Pending |

| COMP-03 | Compliance & Policy Management | Phase 4 | Pending |

| COMP-04 | Compliance & Policy Management | Phase 4 | Pending |

| COMP-05 | Compliance & Policy Management | Phase 4 | Pending |

| COMP-06 | Compliance & Policy Management | Phase 4 | Pending |

| BOARD-01 | Board Management & Corporate Governance | Phase 5 | Complete |

| BOARD-02 | Board Management & Corporate Governance | Phase 5 | Complete |

| BOARD-03 | Board Management & Corporate Governance | Phase 5 | Complete |

| BOARD-04 | Board Management & Corporate Governance | Phase 5 | Complete |

| BOARD-05 | Board Management & Corporate Governance | Phase 5 | Complete |

| BOARD-06 | Board Management & Corporate Governance | Phase 5 | Complete |

| AUDIT-01 | Internal Audit & Findings | Phase 6 | Pending |

| AUDIT-02 | Internal Audit & Findings | Phase 6 | Pending |

| AUDIT-03 | Internal Audit & Findings | Phase 6 | Pending |

| AUDIT-04 | Internal Audit & Findings | Phase 6 | Pending |

| AUDIT-05 | Internal Audit & Findings | Phase 6 | Pending |

| INCD-01 | Incident & Whistleblower Management | Phase 7 | Complete |

| INCD-02 | Incident & Whistleblower Management | Phase 7 | Complete |

| INCD-03 | Incident & Whistleblower Management | Phase 7 | Complete |

| INCD-04 | Incident & Whistleblower Management | Phase 7 | Complete |

| INCD-05 | Incident & Whistleblower Management | Phase 7 | Complete |

| RPT-01 | Reporting & Decision Intelligence | Phase 8 | Complete |

| RPT-02 | Reporting & Decision Intelligence | Phase 8 | Complete |

| RPT-03 | Reporting & Decision Intelligence | Phase 8 | Complete |

| RPT-04 | Reporting & Decision Intelligence | Phase 8 | Complete |

| TRAIL-01 | Audit Trail & Data Integrity | Phase 1 | Pending |

| TRAIL-02 | Audit Trail & Data Integrity | Phase 1 | Pending |

| TRAIL-03 | Audit Trail & Data Integrity | Phase 1 | Pending |

| TRAIL-04 | Audit Trail & Data Integrity | Phase 1 | Pending |



**Coverage Summary:** 44 v1 requirements mapped. 100% coverage achieved. No orphaned requirements.



---



## Phase Progress



| Phase | Name | Requirements | Status | Completed |

|-------|------|--------------|--------|-----------|

| 1 | Foundation | 12 | Not Started | â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ |

| 2 | Strategic Planning | 6 | Not Started | â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ |

| 3 | Enterprise Risk Management | 8 | Not Started | â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ |

| 4 | Compliance Management | 6 | Not Started | â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ |

| 5 | Board Management | 6 | Not Started | â”œÃ³Î“Ã©Â¼Î“Ã‡Â¥ |

| 6 | Internal Audit | 5/5 | Complete   | 2026-05-23 |

| 7 | Incident & Whistleblower | 5/5 | Complete    | 2026-05-23 |

| 8 | Executive Dashboard & Reporting | 4/4 | Complete   | 2026-05-23 |



---



*Created: 2026-05-22*



*Phase 6 planned: 2026-05-23*

*Phases 9–14 added: 2026-05-25 — Enterprise Audit Enhancement (v2.0 bridge plan)*



---



### Phase 9: KRI/KCI Framework and Threshold Alerts

**Goal:** Governance officers can define Key Risk Indicators and Key Control Indicators, record period readings, and receive automated value-threshold alerts when KPIs, KRIs, or KCIs breach configured tolerance levels.

**Depends on:** Phase 2 (KPI patterns), Phase 3 (risks and controls)

**Requirements:** BRIDGE-KRI-01, BRIDGE-KRI-02, BRIDGE-KRI-03, BRIDGE-KCI-01, BRIDGE-KCI-02, BRIDGE-KCI-03, BRIDGE-ALERT-01, BRIDGE-ALERT-02

**Success Criteria:**

1. Risk officer can define a KRI linked to a risk with metric name, unit, target value, alert threshold, direction (increasing = worse / decreasing = worse), and owner

2. Risk officer can record KRI period readings (period start/end, actual value, status, notes) without overwriting prior readings

3. Audit officer can define a KCI linked to a control with metric name, unit, target value, alert threshold, and test cadence

4. Audit officer can record KCI readings (period, actual value, status, evidence reference) per scheduled test cycle

5. System automatically fires threshold-breach email alerts (via Resend) to the KRI/KCI owner and governance officer when actual value crosses the configured alert threshold

6. Executive dashboard displays a KRI status tile (count by status: on-track / at-risk / breached) and a KCI health grid (% of controls green)

7. KRI and KCI readings are immutably recorded via Postgres audit triggers consistent with existing audit trail

**UI hint**: yes

**Plans:** 5 plans

Plans:
- [ ] 09-01-PLAN.md — KRI/KCI migrations (schema + RLS + triggers for 4 tables) + supabase db push
- [ ] 09-02-PLAN.md — Types + Zod schemas + utils + server actions + queries + alert services + cron API routes
- [ ] 09-03-PLAN.md — KRI UI (list /risk/kris, create form, detail page, reading form) + shared IndicatorSparkline/IndicatorStatusBadge
- [ ] 09-04-PLAN.md — KCI UI (list /audit/kcis, create form, detail page, reading form)
- [ ] 09-05-PLAN.md — Dashboard KRI/KCI tiles + risk/audit page integration + sidebar nav + verification checkpoint



---



### Phase 10: Audit Universe, Programs, and Continuous Control Testing

**Goal:** Audit officers can maintain a risk-based audit plan with structured audit engagements, test procedures, and automated control test scheduling that generates findings when controls fail.

**Depends on:** Phase 6 (audit findings patterns), Phase 4 (compliance obligation patterns)

**Requirements:** BRIDGE-AUD-01, BRIDGE-AUD-02, BRIDGE-AUD-03, BRIDGE-AUD-04, BRIDGE-AUD-05, BRIDGE-AUD-06

**Success Criteria:**

1. Audit officer can create an annual audit plan with title, coverage period, and status (draft / active / closed)

2. Audit officer can create audit engagements under a plan with scope description, risk basis, lead auditor, planned start/end dates, and status

3. Audit officer can define test procedures under an engagement with title, objective, test type (interview / observation / reperformance / analytical), and frequency

4. System maintains a control test schedule — for each control flagged for continuous testing, a cron job fires daily and creates a finding automatically when the control has no recent evidence within its test cadence window

5. Audit officer can create workpapers linked to an engagement and a test procedure with structured reference, content notes, reviewer, and status (draft / reviewed / approved)

6. Governance report PDF includes a combined assurance summary section showing audit findings, risk treatment status, and compliance obligations with overlapping root causes

7. Admin can configure automated governance report dispatch on a schedule (weekly / monthly / quarterly) with recipient email list; report is generated and emailed without manual trigger

**UI hint**: yes

**Plans:** 5 plans

Plans:
- [x] 14-01-PLAN.md — Wave 0 test stubs for forecast and anomaly detection utilities
- [x] 14-02-PLAN.md — Forecast utility (linearRegression/forecastPoints) + ForecastChart component + SourceModule type extension
- [ ] 14-03-PLAN.md — Per-module CSV export API route (9 modules) + Analytics Export admin page + accordion API docs
- [ ] 14-04-PLAN.md — Anomaly detection service + AnomalyAlertEmail template + cron route (GET) + vercel.json
- [ ] 14-05-PLAN.md — KPI and KRI detail page ForecastChart integration + human verification checkpoint



---



### Phase 11: Real-Time Dashboard, Cross-Module Graph, and Notification Centre

**Goal:** Executive dashboard auto-updates in real time without page refresh; a cross-module traceability graph visualises the Objective → KPI → Risk → Control → Finding chain; an in-app notification bell surfaces all governance alerts.

**Depends on:** Phase 8 (dashboard patterns), Phase 9 (KRI/KCI data), Phase 10 (audit data)

**Requirements:** BRIDGE-RT-01, BRIDGE-RT-02, BRIDGE-RT-03, BRIDGE-RT-04, BRIDGE-NOTIF-01, BRIDGE-NOTIF-02

**Success Criteria:**

1. Executive dashboard risk heatmap, compliance posture card, and overdue actions table update automatically (no page reload) within 5 seconds of a relevant data change

2. Real-time updates are scoped to the authenticated user's institution_id — cross-institution data cannot flow through Supabase Realtime channels

3. A traceability graph panel on the executive dashboard renders a Nivo network graph connecting Strategic Objectives → KPIs → Risks → Controls → Audit Findings using FK relationships; clicking a node navigates to its detail page

4. A notification bell icon in the protected layout header shows an unread badge count; clicking opens a dropdown listing the 10 most recent governance alerts (escalation emails, threshold breaches, overdue items) with links to source records

5. Notification records are stored in a `notifications` table (user_id, title, body, link, source_module, read_at) and are inserted automatically whenever the existing escalation services fire Resend emails

6. Users can mark individual notifications read or mark all read; unread count badge updates without page reload

**UI hint**: yes

**Plans:** TBD



---



### Phase 12: ESG Metrics and Reporting Module

**Goal:** Governance officers can collect Environmental, Social, and Governance metrics against GRI/SASB/TCFD frameworks, track targets, and generate stakeholder-facing ESG disclosure reports.

**Depends on:** Phase 1 (auth, institutional context), Phase 4 (evidence upload patterns)

**Requirements:** BRIDGE-ESG-01, BRIDGE-ESG-02, BRIDGE-ESG-03, BRIDGE-ESG-04, BRIDGE-ESG-05, BRIDGE-ESG-06

**Success Criteria:**

1. System includes a seeded reference table of ESG frameworks (GRI Standards, SASB, TCFD) with associated metric codes and descriptions

2. ESG Officer can create institution-specific ESG metric definitions (metric name, code, category: Environmental / Social / Governance, unit, target value, framework reference)

3. ESG Officer can record metric readings per period (actual value, notes, evidence upload) without overwriting historical records

4. Dashboard displays an ESG posture panel: Environmental metrics trend chart, Social metrics summary card, Governance score composite, and a materiality matrix scatter plot (Nivo scatter: stakeholder significance vs. business significance)

5. System can generate a GRI-indexed ESG disclosure report as a PDF (via existing Puppeteer setup) covering all framework metrics with actual vs. target values, period-over-period trend, and evidence references

6. ESG readings and metric definitions are protected by RLS (institution-scoped) and recorded in the immutable audit trail

**UI hint**: yes

**Plans:** TBD



---



### Phase 13: ISO 9001:2015 Quality Management System Module

**Goal:** Governance officers can manage QMS controlled documents, track quality objectives, log non-conformances with corrective action plans, and record management reviews per ISO 9001:2015 requirements.

**Depends on:** Phase 1 (auth, audit trail), Phase 4 (evidence upload patterns)

**Requirements:** BRIDGE-QMS-01, BRIDGE-QMS-02, BRIDGE-QMS-03, BRIDGE-QMS-04, BRIDGE-QMS-05

**Success Criteria:**

1. Admin can create QMS documents (document number, title, type: policy / procedure / work-instruction / form / record, version, status: draft / active / superseded / obsolete, effective date, review date, owner) with version increment on each update

2. System automatically alerts document owner 30 days before review date is reached (mirrors compliance obligation escalation pattern)

3. Quality officer can log non-conformances (NC number auto-generated, description, source: internal-audit / customer / supplier / process, root cause, corrective action plan, target closure date, status: open / in-progress / closed / verified)

4. Quality officer can record management review meetings with mandatory input sections (audit results, customer feedback, process performance, corrective action status) and output action items assigned to owners with due dates

5. Dashboard displays a QMS posture tile: count of active documents pending review, open non-conformances by source, and overdue corrective actions

**UI hint**: yes

**Plans:** TBD



---



### Phase 14: Advanced Analytics — Forecasting, Anomaly Detection, and Data Export

**Goal:** The platform surfaces predictive KPI/KRI forecasts, anomaly detection alerts, and provides analytics-grade structured data export — without requiring an external Python/R runtime for the initial delivery.

**Depends on:** Phase 9 (KRI/KCI readings), Phase 2 (KPI readings data)

**Requirements:** BRIDGE-ANA-01, BRIDGE-ANA-02, BRIDGE-ANA-03, BRIDGE-ANA-04

**Success Criteria:**

1. KPI and KRI detail pages display a simple linear regression forecast band for the next 2 periods based on the last 4–6 readings, rendered as a Recharts ReferenceLine range above the trend sparkline

2. A background cron job runs daily and detects KPI/KRI readings that deviate more than 2 standard deviations from the trailing 6-period mean; detected anomalies insert notification records and send Resend email alerts to the metric owner

3. Admin can download a structured CSV export for each module (risks, KPIs, KRIs, KCIs, obligations, findings, incidents, board actions, ESG metrics) from a new Analytics Export admin page; exports are institution-scoped via RLS

4. The Analytics Export page documents the available endpoints and data schemas so that external R or Python workflows can consume the exports (no runtime integration required in this phase — documentation and clean export format is the deliverable)

**UI hint**: yes

**Plans:** 2/5 plans executed



---




