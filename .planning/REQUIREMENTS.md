# GRC-Nexus — v1 Requirements

Generated from: whitepaper.md + research (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY)
Date: 2026-05-22

---

## v1 Requirements

### Authentication & Access Control

- [ ] **AUTH-01**: User can create an account with email and password
- [ ] **AUTH-02**: User can log in and stay authenticated across browser sessions
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: Each user is assigned an institutional role: admin, board-member, ceo, risk-officer, audit-officer, or dept-head
- [ ] **AUTH-05**: Access to all data and actions is enforced by Supabase Row-Level Security policies (not only application code)
- [ ] **AUTH-06**: User can only see data belonging to their own institution
- [ ] **AUTH-07**: Privileged users (admin, board-member) require MFA before accessing sensitive workflows
- [ ] **AUTH-08**: System generates an immutable audit event for every login, logout, and permission change

### Strategic Planning & KPIs

- [ ] **STRAT-01**: Admin can create institutional strategic objectives tagged to NDS2 pillars or institutional 5-year goals
- [ ] **STRAT-02**: Each objective has an owner, start date, target date, and current status
- [ ] **STRAT-03**: Admin can create KPIs linked to a strategic objective, with baseline value, target value, unit of measure, and reporting frequency
- [ ] **STRAT-04**: KPI owners can record period readings (actual value, reporting period, notes)
- [ ] **STRAT-05**: System calculates KPI performance status: On Track / At Risk / Off Track based on actual vs. target
- [ ] **STRAT-06**: Dashboard shows KPI summary grid with status colors and trend indicators

### Enterprise Risk Management (ERM)

- [ ] **RISK-01**: User can create a risk entry linked to a strategic objective, with title, description, category, and owner
- [ ] **RISK-02**: User can score a risk on a 5×5 likelihood-impact matrix (1–5 each) for inherent risk
- [ ] **RISK-03**: User can record residual risk score after applying controls
- [ ] **RISK-04**: System calculates risk score (likelihood × impact) and applies a severity label: Low (1–4), Medium (5–9), High (10–15), Critical (16–25)
- [ ] **RISK-05**: User can add risk treatments (mitigation actions) with owner, due date, and status
- [ ] **RISK-06**: Dashboard displays a live 5×5 risk heatmap showing all institutional risks by inherent score
- [ ] **RISK-07**: Overdue risk treatments trigger escalation notifications to the treatment owner and their manager
- [ ] **RISK-08**: Risk register supports filtering by category, severity, owner, and status

### Compliance & Policy Management

- [ ] **COMP-01**: Admin can create compliance obligations linked to a regulatory framework (PECOGA, PPDPA, NDS2, etc.) with due date and owner
- [ ] **COMP-02**: Compliance officers can upload evidence files (PDF, DOCX, XLSX, images) as proof of compliance
- [ ] **COMP-03**: Uploaded evidence files get an immutable filename (timestamp + SHA-256 hash) and cannot be overwritten
- [ ] **COMP-04**: Compliance officer can attest to an obligation as Compliant / Partially Compliant / Non-Compliant with a signed timestamp
- [ ] **COMP-05**: Dashboard shows compliance posture: % obligations met, overdue count, obligations expiring in next 30 days
- [ ] **COMP-06**: Overdue obligations trigger automated escalation alerts at 3 days before, on due date, and 7+ days overdue

### Board Management & Corporate Governance

- [ ] **BOARD-01**: Admin can create a board meeting with date, agenda items, and attendees
- [ ] **BOARD-02**: Users can upload and attach board pack documents to a meeting
- [ ] **BOARD-03**: Board members can record resolutions (motion text, proposer, seconder, vote outcome) per meeting
- [ ] **BOARD-04**: System tracks board action items from resolutions with owner, due date, and status
- [ ] **BOARD-05**: Overdue board actions trigger escalation notifications to the action owner
- [ ] **BOARD-06**: Board meeting records are immutable after closure (no edits, only amendments as new entries)

### Internal Audit & Findings

- [x] **AUDIT-01**: Audit officers can create audit findings linked to a control, risk, or compliance obligation
- [x] **AUDIT-02**: Each finding has a severity (Minor, Moderate, Major, Critical), root cause, and remediation owner
- [x] **AUDIT-03**: Remediation owners can update finding status (Open, In Progress, Closed) and upload evidence of closure
- [x] **AUDIT-04**: Dashboard shows audit finding summary: open count by severity, overdue remediations
- [x] **AUDIT-05**: Overdue audit remediations trigger escalation to the finding owner and audit officer

### Incident & Whistleblower Management

- [ ] **INCD-01**: Any user can submit an incident report (named or anonymous) via a web form
- [ ] **INCD-02**: Anonymous reports do not store user identity in any table, including audit logs
- [ ] **INCD-03**: Incident cases are visible only to assigned investigators and admins (role-segregated RLS)
- [ ] **INCD-04**: Investigators can triage, assign, escalate, and close incident cases with status tracking
- [ ] **INCD-05**: Case closure requires a resolution summary and is logged as an immutable record

### Reporting & Decision Intelligence

- [ ] **RPT-01**: Executive dashboard shows consolidated view: KPI summary, risk heatmap, compliance posture, top overdue actions
- [ ] **RPT-02**: Users can filter dashboard by time period, department, and module
- [ ] **RPT-03**: System can export a governance summary report as PDF (risk heatmap + KPI status + compliance posture)
- [ ] **RPT-04**: Audit trail is viewable by admin and audit officers as a filterable log of all governance events

### Audit Trail & Data Integrity

- [ ] **TRAIL-01**: Every create, update, and delete action on governance data records an immutable audit event (actor, timestamp, table, record ID, before/after values)
- [ ] **TRAIL-02**: Audit events are stored in a dedicated append-only table; no UPDATE or DELETE is permitted on audit events
- [ ] **TRAIL-03**: Audit events are enforced at the Postgres trigger layer (SECURITY DEFINER) so they survive application bugs
- [ ] **TRAIL-04**: Evidence file integrity is verified on download via SHA-256 checksum; alerts on mismatch

---

## v2 Requirements (Deferred)

- PECOGA Section 25 board evaluation workflows (confidential; complexity deferred)
- Vendor & third-party risk onboarding and assessment module
- NDS2 full objective taxonomy with hierarchical pillar → outcome → output structure
- Advanced statutory PDF reports with formal regulatory formatting (PECOGA/PPDPA templates)
- Multi-institution cross-reporting dashboard and consolidated scorecards
- Custom no-code workflow builder for obligation/risk workflow configuration
- SAML/SSO (Active Directory, OIDC) integration
- eGP portal integration for procurement compliance data
- SMS/telephony whistleblower channel
- Mobile-native application
- AI-powered risk predictive analytics and anomaly detection
- Full policy lifecycle management (draft → review → approve → publish → acknowledge)

---

## Out of Scope

- Vendor/third-party risk module — v2, complex onboarding flows
- Multi-institution shared data plane — v2, requires multi-tenant architecture beyond single institution
- eGP procurement integration — requires external API access not available in prototype
- SMS/telephony intake — infrastructure dependency
- Mobile native app — web-responsive sufficient for prototype demos
- Custom workflow engine — Phase 3+, premature abstraction for prototype
- AI/ML predictive features — Phase 3+ after data volume established

---

## Traceability

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
| BOARD-01 | Board Management & Corporate Governance | Phase 5 | Pending |
| BOARD-02 | Board Management & Corporate Governance | Phase 5 | Pending |
| BOARD-03 | Board Management & Corporate Governance | Phase 5 | Pending |
| BOARD-04 | Board Management & Corporate Governance | Phase 5 | Pending |
| BOARD-05 | Board Management & Corporate Governance | Phase 5 | Pending |
| BOARD-06 | Board Management & Corporate Governance | Phase 5 | Pending |
| AUDIT-01 | Internal Audit & Findings | Phase 6 | Pending |
| AUDIT-02 | Internal Audit & Findings | Phase 6 | Pending |
| AUDIT-03 | Internal Audit & Findings | Phase 6 | Pending |
| AUDIT-04 | Internal Audit & Findings | Phase 6 | Pending |
| AUDIT-05 | Internal Audit & Findings | Phase 6 | Pending |
| INCD-01 | Incident & Whistleblower Management | Phase 7 | Pending |
| INCD-02 | Incident & Whistleblower Management | Phase 7 | Pending |
| INCD-03 | Incident & Whistleblower Management | Phase 7 | Pending |
| INCD-04 | Incident & Whistleblower Management | Phase 7 | Pending |
| INCD-05 | Incident & Whistleblower Management | Phase 7 | Pending |
| RPT-01 | Reporting & Decision Intelligence | Phase 8 | Pending |
| RPT-02 | Reporting & Decision Intelligence | Phase 8 | Pending |
| RPT-03 | Reporting & Decision Intelligence | Phase 8 | Pending |
| RPT-04 | Reporting & Decision Intelligence | Phase 8 | Pending |
| TRAIL-01 | Audit Trail & Data Integrity | Phase 1 | Pending |
| TRAIL-02 | Audit Trail & Data Integrity | Phase 1 | Pending |
| TRAIL-03 | Audit Trail & Data Integrity | Phase 1 | Pending |
| TRAIL-04 | Audit Trail & Data Integrity | Phase 1 | Pending |

*Traceability updated by roadmapper on 2026-05-22 — phase assignments complete*
