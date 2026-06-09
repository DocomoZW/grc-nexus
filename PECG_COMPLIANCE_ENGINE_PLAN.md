# PECG Act & ZimCode Compliance Engine Plan for GRC-Nexus

## Executive Summary

This document outlines a plan to build a **PECG Act (Public Entities Corporate Governance Act) Compliance Engine** within GRC-Nexus that aligns with the existing codebase architecture. The engine will automate compliance monitoring against the PECG Act and ZimCode, transforming manual oversight into real-time, AI-assisted governance.

---

## 1. Regulatory Framework Analysis

### 1.1 PECG Act (Chapter 10:31) — Key Compliance Rules

The PECG Act establishes the following measurable compliance requirements:

#### A. Board Appointment & Composition (Section 11)
| Rule | Requirement | Penalty |
|------|-------------|---------|
| TERM_LIMIT | Board members max 4 years, renewable once (max 8 years total) | Automatic removal |
| MEMBERSHIP_LIMIT | Max 3 boards total per person | Invalidation of appointment |
| MERIT_BASED | Appointments based on merit, equal gender representation | CGU can reject |
| CIVIL_SERVANT_RESTRICTION | Permanent Secretaries prohibited; civil servants cannot form majority | Invalidation |
| DATABASE_INCLUSION | All appointees must be in CGU national database | Appointment void |

#### B. Performance Management (Sections 22-25)
| Rule | Requirement | Deadline |
|------|-------------|----------|
| STRATEGIC_PLAN | Board must submit 2-6 year strategic plan | Within 6 months of appointment |
| PERFORMANCE_CONTRACT_BOARD | Written performance contract with line Minister | Within 2 months of appointment |
| PERFORMANCE_CONTRACT_CEO | CEO performance contract with board | Before assuming office |
| ANNUAL_REVIEW | Annual compliance review with strategic plan | Annually |

#### C. Internal Governance (Sections 26-27)
| Rule | Requirement | Frequency |
|------|-------------|-----------|
| BOARD_CHARTER | Every board must prepare a board charter | Once, then reviewed annually |
| CODE_OF_ETHICS | CEO must prepare code of ethics | Once, then reviewed annually |
| ASSET_DECLARATION | Board members declare assets (property, business interests, items >$100,000) | Within 3 months of appointment, then annually |

#### D. Meetings & Reporting (Sections 33, 36)
| Rule | Requirement | Frequency |
|------|-------------|-----------|
| QUARTERLY_MEETINGS | Board must meet at least once every 3 months | Quarterly (min 4/year) |
| AGM_REQUIRED | Annual General Meeting with CGU, line Ministry, Accountant-General | Annually |
| ANNUAL_AUDIT | Accounts audited by Auditor-General or registered public auditor | Annually |
| CONFLICT_DISCLOSURE | Immediate disclosure of pecuniary interests | Real-time |

#### E. Remuneration & Benefits (Sections 12-14, 19-20)
| Rule | Requirement | Limit |
|------|-------------|-------|
| STANDARDIZED_ALLOWANCES | Minister sets standard sitting allowances | Presidential approval required for deviations |
| PAY_CAP | Remuneration cap at 30% of entity revenue/budget | 30% of previous year revenue |
| PROHIBITED_LOANS | No loans/credit to board members or associates | Criminal offense (Level 10 fine / 1 year prison) |

#### F. Penalties & Enforcement (Sections 12-14, 16, 25, 28, 34, 38, 41, 46)
- **Surcharges** for excess remuneration/benefits
- **Immediate dismissal** for:
  - Failure to enter performance contract within 2 months
  - Refusal to declare assets
  - Unauthorized absence from 3 consecutive meetings
  - Conduct inconsistent with membership
- **Criminal penalties** for:
  - Prohibited loans (Level 10 fine + up to 1 year prison)
  - False information to CGU (Level 5-7 fine + 6 months-2 years prison)
  - Conflict of interest violations

### 1.2 ZimCode Requirements

ZimCode adopts an **"Apply or Explain"** approach with the following key principles:

#### A. Board Leadership
| Principle | Requirement |
|-----------|-------------|
| CHAIR_INDEPENDENCE | Chairperson must be independent non-executive, cannot be CEO |
| BALANCE_OF_POWER | Non-executive directors required to prevent concentration |
| MERIT_APPOINTMENTS | All officers appointed based on merit |
| GOVERNANCE_CHARTER | Board must maintain formal charter with vision, mission, values, risk policies, succession plans |

#### B. Board Performance
| Principle | Requirement |
|-----------|-------------|
| SELF_ASSESSMENT | Regular board performance assessment including Chairperson |
| DIRECTOR_DEVELOPMENT | Ongoing director development schemes |
| RISK_COMMITTEE | Risk Management Committee with defined functions |
| WHISTLEBLOWING | Efficient whistle-blowing system |
| MISCONDUCT_CORRECTION | Correct corporate misdemeanors immediately |

#### C. Disclosure & Transparency
| Principle | Requirement |
|-----------|-------------|
| POWER_DISTRIBUTION | Disclose power distribution in financial statements |
| BENEFICIAL_OWNERSHIP | Nominee shareholders disclose beneficial owners |
| ANTI_SELECTIVE_DISCLOSURE | No selective corporate disclosure |
| CONFLICT_REPORTING | Report conduct likely to create conflicts |

#### D. Shareholder & Stakeholder Rights
| Principle | Requirement |
|-----------|-------------|
| VOTING_MECHANISMS | Clear, fair voting rules; proxy/email/fax voting; no voting caps |
| ADEQUATE_NOTICE | Adequate notice for shareholder meetings |
| WRITTEN_AGREEMENTS | Written shareholder agreements |
| EMPLOYEE_SHARE_SCHEMES | Employee share ownership schemes |
| COMMUNITY_BENEFIT | Local communities benefit from company activities |
| ADR | Alternative Dispute Resolution for conflicts |

#### E. Risk & Information Management
| Principle | Requirement |
|-----------|-------------|
| INTEGRATED_REPORTING | Holistic integrated reporting system with ICT |
| RISK_TOLERANCE | Board formally determines risk tolerance levels |
| AUDIT_ROLES | Clear internal and external auditor roles |
| JV_COMPLIANCE | Joint venture contracts comply with Constitution Section 315(2) |

---

## 2. Compliance Engine Architecture

### 2.1 Design Principles

1. **Rule-as-Code** — Each PECG Act/ZimCode requirement is encoded as a deterministic rule
2. **Real-Time Monitoring** — Continuous compliance checking, not just periodic audits
3. **Predictive Alerts** — AI-powered risk scoring before violations occur
4. **Immutable Audit Trail** — All compliance checks and actions are logged
5. **Integration-First** — Seamlessly connects with existing GRC-Nexus modules

### 2.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DATA INGESTION LAYER                                       │
│  • Board appointments (from board_members table)            │
│  • Meeting records (from board_meetings)                    │
│  • Performance contracts (from compliance_obligations)      │
│  • Asset declarations (from new pecg_asset_declarations)    │
│  • Financial disclosures (from new pecg_disclosures)        │
│  • Strategic plans (from new pecg_strategic_plans)          │
│  • User profiles (from user_profiles)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  COMPLIANCE RULE ENGINE                                     │
│  • PECG Act rules (15+ codified rules)                      │
│  • ZimCode principles (12+ codified principles)             │
│  • Custom CGU policy rules                                  │
│  • Rule priority and conflict resolution                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  AI/ML ENHANCEMENT LAYER                                    │
│  • Anomaly detection on governance patterns                 │
│  • Predictive risk scoring per institution                  │
│  • NLP analysis of board minutes/disclosures                │
│  • Classification of violations by severity                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT & ACTION LAYER                                      │
│  • Compliance scorecards per institution                    │
│  • Real-time dashboard alerts                               │
│  • Automated escalation workflows                           │
│  • CGU oversight reports                                    │
│  • Evidence collection for audit trails                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Extensions

### 3.1 New Tables Required

#### `pecg_compliance_rules` — Master rule definitions
```sql
create table public.pecg_compliance_rules (
  id              uuid primary key default gen_random_uuid(),
  rule_code       text not null unique,       -- e.g., 'TERM_LIMIT', 'QUARTERLY_MEETINGS'
  rule_name       text not null,              -- Human-readable name
  regulation      text not null,              -- 'PECG_ACT' or 'ZIMCODE'
  section_ref     text,                       -- PECG Act section or ZimCode principle
  description     text not null,              -- Full rule description
  check_type      text not null,              -- 'deadline', 'threshold', 'presence', 'absence', 'count', 'ratio'
  check_config    jsonb not null,             -- Rule-specific configuration
  severity        text not null default 'warning', -- 'info', 'warning', 'critical', 'legal'
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
```

#### `pecg_compliance_checks` — Individual check executions
```sql
create table public.pecg_compliance_checks (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  rule_id         uuid not null references public.pecg_compliance_rules(id) on delete cascade,
  status          text not null,              -- 'compliant', 'non_compliant', 'at_risk', 'waived', 'not_applicable'
  target_id       uuid,                       -- Related record (e.g., board_member_id, meeting_id)
  target_type     text,                       -- 'board_member', 'meeting', 'obligation', 'declaration', 'disclosure'
  check_data      jsonb,                    -- Snapshot of data used for check
  result_details  jsonb,                    -- Detailed findings
  due_date        date,                       -- When compliance is expected
  checked_at      timestamptz not null default now(),
  checked_by      uuid references auth.users(id) on delete set null, -- null = system
  evidence_count  integer not null default 0,
  notes           text,
  unique (institution_id, rule_id, target_id, target_type)
);
```

#### `pecg_compliance_check_evidence` — Evidence for checks (append-only)
```sql
create table public.pecg_compliance_check_evidence (
  id              uuid primary key default gen_random_uuid(),
  check_id        uuid not null references public.pecg_compliance_checks(id) on delete cascade,
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  storage_path    text not null,
  original_filename text not null,
  mime_type       text not null,
  file_size_bytes bigint not null,
  sha256_hash     text not null,
  uploaded_by     uuid references auth.users(id) on delete set null,
  uploaded_at     timestamptz not null default now()
);
```

#### `pecg_asset_declarations` — Board member asset declarations
```sql
create table public.pecg_asset_declarations (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  board_member_id uuid not null references auth.users(id) on delete cascade,
  declaration_year integer not null,         -- Year of declaration
  declaration_date  date not null,             -- Date submitted
  immovable_properties jsonb,                -- List of properties
  business_interests jsonb,                  -- List of business interests
  high_value_items jsonb,                    -- Items > $100,000
  total_value_estimate numeric,               -- Estimated total value
  declaration_file_path text,                -- Uploaded declaration file
  verified_by     uuid references auth.users(id) on delete set null,
  verified_at     timestamptz,
  status          text not null default 'pending', -- 'pending', 'verified', 'flagged', 'rejected'
  created_at      timestamptz not null default now()
);
```

#### `pecg_strategic_plans` — Strategic plans for institutions
```sql
create table public.pecg_strategic_plans (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  plan_period_start integer not null,          -- e.g., 2026
  plan_period_end   integer not null,          -- e.g., 2030 (2-6 years per PECG Act)
  title           text not null,
  objectives      jsonb not null,            -- Array of strategic objectives
  priorities      jsonb not null,              -- Array of priorities
  performance_indicators jsonb not null,       -- KPIs
  plan_document_path text,                    -- Uploaded plan document
  submitted_to_minister boolean not null default false,
  submitted_to_cgu boolean not null default false,
  submitted_to_finance boolean not null default false,
  submitted_at    date,
  approved_by_minister boolean,
  approved_at     date,
  status          text not null default 'draft', -- 'draft', 'submitted', 'approved', 'rejected', 'expired'
  created_at      timestamptz not null default now()
);
```

#### `pecg_disclosures` — Conflict of interest and other disclosures
```sql
create table public.pecg_disclosures (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  discloser_id    uuid not null references auth.users(id) on delete cascade,
  disclosure_type text not null,              -- 'pecuniary_interest', 'conflict_of_interest', 'related_party_transaction', 'beneficial_ownership'
  description     text not null,
  related_party_name text,                    -- Name of related party
  relationship_type text,                     -- Type of relationship
  value_estimate  numeric,                    -- Estimated monetary value
  disclosed_at    timestamptz not null default now(),
  meeting_id      uuid references public.board_meetings(id) on delete set null,
  recused_from_discussion boolean not null default false,
  recused_from_voting boolean not null default false,
  status          text not null default 'active', -- 'active', 'resolved', 'flagged', 'escalated'
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
```

#### `pecg_performance_contracts` — Performance contracts for board members and CEOs
```sql
create table public.pecg_performance_contracts (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  contract_type   text not null,              -- 'board_member' or 'ceo'
  employee_id     uuid not null references auth.users(id) on delete cascade,
  appointed_at    date not null,
  contract_due_at date not null,              -- Must be within 2 months of appointment (board) or before office (CEO)
  contract_signed_at date,                    -- When contract was actually signed
  contract_document_path text,              -- Uploaded contract
  performance_targets jsonb not null,         -- KPI targets
  review_period   text not null default 'quarterly', -- 'quarterly', 'annual'
  last_reviewed_at date,
  next_review_due_at date,
  status          text not null default 'pending', -- 'pending', 'signed', 'in_progress', 'completed', 'expired', 'breached'
  created_at      timestamptz not null default now()
);
```

#### `pecg_institution_compliance_scores` — Aggregated compliance scores
```sql
create table public.pecg_institution_compliance_scores (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  score_date      date not null,              -- Date of score calculation
  overall_score   numeric(5,2) not null,      -- 0-100 percentage
  pecg_act_score  numeric(5,2) not null,      -- PECG Act specific score
  zimcode_score   numeric(5,2) not null,      -- ZimCode specific score
  board_composition_score numeric(5,2),       -- Sub-score for board rules
  performance_management_score numeric(5,2), -- Sub-score for performance
  governance_score numeric(5,2),              -- Sub-score for governance
  meeting_score   numeric(5,2),               -- Sub-score for meetings
  disclosure_score numeric(5,2),              -- Sub-score for disclosures
  risk_level      text not null default 'low', -- 'low', 'medium', 'high', 'critical'
  check_count     integer not null,           -- Total checks performed
  compliant_count integer not null,             -- Compliant checks
  non_compliant_count integer not null,       -- Non-compliant checks
  at_risk_count   integer not null,             -- At-risk checks
  score_details   jsonb,                      -- Detailed breakdown
  calculated_at   timestamptz not null default now(),
  calculated_by   uuid references auth.users(id) on delete set null, -- null = system
  unique (institution_id, score_date)
);
```

### 3.2 Indexes for Performance
```sql
-- Compliance checks indexes
create index idx_pecg_checks_institution_id on public.pecg_compliance_checks (institution_id);
create index idx_pecg_checks_rule_id on public.pecg_compliance_checks (rule_id);
create index idx_pecg_checks_status on public.pecg_compliance_checks (status);
create index idx_pecg_checks_target on public.pecg_compliance_checks (target_id, target_type);
create index idx_pecg_checks_checked_at on public.pecg_compliance_checks (checked_at desc);

-- Asset declarations indexes
create index idx_pecg_assets_institution_id on public.pecg_asset_declarations (institution_id);
create index idx_pecg_assets_board_member on public.pecg_asset_declarations (board_member_id);
create index idx_pecg_assets_year on public.pecg_asset_declarations (declaration_year);

-- Strategic plans indexes
create index idx_pecg_plans_institution_id on public.pecg_strategic_plans (institution_id);
create index idx_pecg_plans_period on public.pecg_strategic_plans (plan_period_start, plan_period_end);

-- Disclosures indexes
create index idx_pecg_disclosures_institution_id on public.pecg_disclosures (institution_id);
create index idx_pecg_disclosures_discloser on public.pecg_disclosures (discloser_id);
create index idx_pecg_disclosures_type on public.pecg_disclosures (disclosure_type);

-- Performance contracts indexes
create index idx_pecg_contracts_institution_id on public.pecg_performance_contracts (institution_id);
create index idx_pecg_contracts_employee on public.pecg_performance_contracts (employee_id);
create index idx_pecg_contracts_status on public.pecg_performance_contracts (status);

-- Compliance scores indexes
create index idx_pecg_scores_institution_id on public.pecg_institution_compliance_scores (institution_id);
create index idx_pecg_scores_date on public.pecg_institution_compliance_scores (score_date desc);
```

---

## 4. Compliance Rule Engine — Implementation Plan

### 4.1 Rule Categories

#### Category A: Board Composition Rules (PECG Act Section 11)
```typescript
const BOARD_COMPOSITION_RULES = [
  {
    code: 'TERM_LIMIT',
    name: 'Board Member Term Limit',
    regulation: 'PECG_ACT',
    section: 'Section 11',
    checkType: 'deadline',
    config: {
      maxTermYears: 4,
      maxRenewals: 1,
      maxTotalYears: 8,
    },
    severity: 'critical',
  },
  {
    code: 'MEMBERSHIP_LIMIT',
    name: 'Board Membership Limit',
    regulation: 'PECG_ACT',
    section: 'Section 11',
    checkType: 'count',
    config: {
      maxBoards: 3,
    },
    severity: 'critical',
  },
  {
    code: 'GENDER_REPRESENTATION',
    name: 'Gender Representation',
    regulation: 'PECG_ACT',
    section: 'Section 11',
    checkType: 'ratio',
    config: {
      minFemaleRatio: 0.30, // 30% minimum
      minMaleRatio: 0.30,
    },
    severity: 'warning',
  },
  {
    code: 'CIVIL_SERVANT_RESTRICTION',
    name: 'Civil Servant Board Restriction',
    regulation: 'PECG_ACT',
    section: 'Section 11',
    checkType: 'ratio',
    config: {
      maxCivilServantRatio: 0.49, // Cannot form majority
      prohibitedRoles: ['permanent_secretary'],
    },
    severity: 'critical',
  },
  {
    code: 'DATABASE_INCLUSION',
    name: 'Board Member Database Inclusion',
    regulation: 'PECG_ACT',
    section: 'Section 6',
    checkType: 'presence',
    config: {
      requiredInDatabase: true,
    },
    severity: 'critical',
  },
];
```

#### Category B: Meeting Rules (PECG Act Section 33, ZimCode)
```typescript
const MEETING_RULES = [
  {
    code: 'QUARTERLY_MEETINGS',
    name: 'Quarterly Board Meetings',
    regulation: 'PECG_ACT',
    section: 'Section 33',
    checkType: 'count',
    config: {
      minMeetingsPerYear: 4,
      maxGapDays: 92, // ~3 months
    },
    severity: 'critical',
  },
  {
    code: 'AGM_REQUIRED',
    name: 'Annual General Meeting',
    regulation: 'PECG_ACT',
    section: 'Section 33',
    checkType: 'presence',
    config: {
      requiredAttendees: ['cgu_representative', 'line_ministry', 'accountant_general'],
      minAttendees: 3,
    },
    severity: 'warning',
  },
  {
    code: 'CONFLICT_DISCLOSURE',
    name: 'Conflict of Interest Disclosure',
    regulation: 'PECG_ACT',
    section: 'Section 34',
    checkType: 'presence',
    config: {
      requiredPerMeeting: true,
      recusalRequired: true,
    },
    severity: 'critical',
  },
];
```

#### Category C: Performance Management Rules (PECG Act Sections 22-25)
```typescript
const PERFORMANCE_RULES = [
  {
    code: 'STRATEGIC_PLAN',
    name: 'Strategic Plan Submission',
    regulation: 'PECG_ACT',
    section: 'Section 22',
    checkType: 'deadline',
    config: {
      maxPlanYears: 6,
      minPlanYears: 2,
      submitToMinister: true,
      submitToCGU: true,
      submitToFinance: true,
      deadlineMonths: 6,
    },
    severity: 'warning',
  },
  {
    code: 'PERFORMANCE_CONTRACT_BOARD',
    name: 'Board Member Performance Contract',
    regulation: 'PECG_ACT',
    section: 'Section 25',
    checkType: 'deadline',
    config: {
      deadlineDays: 60, // Within 2 months
      contractWith: 'line_minister',
      required: true,
    },
    severity: 'critical',
  },
  {
    code: 'PERFORMANCE_CONTRACT_CEO',
    name: 'CEO Performance Contract',
    regulation: 'PECG_ACT',
    section: 'Section 23',
    checkType: 'deadline',
    config: {
      deadlineEvent: 'before_assuming_office',
      contractWith: 'board',
      required: true,
    },
    severity: 'critical',
  },
  {
    code: 'ANNUAL_REVIEW',
    name: 'Annual Performance Review',
    regulation: 'PECG_ACT',
    section: 'Section 24',
    checkType: 'deadline',
    config: {
      frequency: 'annual',
      submitToMinister: true,
    },
    severity: 'warning',
  },
];
```

#### Category D: Governance Rules (PECG Act Sections 26-27, ZimCode)
```typescript
const GOVERNANCE_RULES = [
  {
    code: 'BOARD_CHARTER',
    name: 'Board Charter',
    regulation: 'PECG_ACT',
    section: 'Section 26',
    checkType: 'presence',
    config: {
      requiredElements: ['vision', 'mission', 'values', 'risk_assessment', 'succession_plan'],
      reviewFrequency: 'annual',
    },
    severity: 'warning',
  },
  {
    code: 'CODE_OF_ETHICS',
    name: 'Code of Ethics',
    regulation: 'PECG_ACT',
    section: 'Section 26',
    checkType: 'presence',
    config: {
      requiredElements: ['professional_ethics', 'efficiency', 'transparency'],
      preparedBy: 'ceo',
      reviewFrequency: 'annual',
    },
    severity: 'warning',
  },
  {
    code: 'ASSET_DECLARATION',
    name: 'Asset Declaration',
    regulation: 'PECG_ACT',
    section: 'Section 37',
    checkType: 'deadline',
    config: {
      initialDeadlineDays: 90, // Within 3 months
      frequency: 'annual',
      requiredElements: ['immovable_property', 'business_interests', 'high_value_items'],
      highValueThreshold: 100000,
    },
    severity: 'critical',
  },
  {
    code: 'RISK_COMMITTEE',
    name: 'Risk Management Committee',
    regulation: 'ZIMCODE',
    section: 'Principle 5',
    checkType: 'presence',
    config: {
      required: true,
      definedFunctions: true,
    },
    severity: 'warning',
  },
  {
    code: 'WHISTLEBLOWING_SYSTEM',
    name: 'Whistleblowing System',
    regulation: 'ZIMCODE',
    section: 'Principle 5',
    checkType: 'presence',
    config: {
      required: true,
      anonymousReporting: true,
    },
    severity: 'warning',
  },
];
```

#### Category E: Financial & Remuneration Rules (PECG Act Sections 12-14, 19-20)
```typescript
const FINANCIAL_RULES = [
  {
    code: 'PAY_CAP',
    name: 'Remuneration Cap',
    regulation: 'PECG_ACT',
    section: 'Section 20',
    checkType: 'threshold',
    config: {
      maxRatio: 0.30, // 30% of revenue
      appliesTo: 'all_employees_including_ceo',
    },
    severity: 'critical',
  },
  {
    code: 'STANDARDIZED_ALLOWANCES',
    name: 'Standardized Allowances',
    regulation: 'PECG_ACT',
    section: 'Section 12',
    checkType: 'presence',
    config: {
      ministerFormulated: true,
      presidentialApprovalRequired: true,
    },
    severity: 'warning',
  },
  {
    code: 'PROHIBITED_LOANS',
    name: 'Prohibited Loans to Board Members',
    regulation: 'PECG_ACT',
    section: 'Section 14',
    checkType: 'absence',
    config: {
      prohibitedRecipients: ['board_members', 'associates'],
      criminalOffense: true,
    },
    severity: 'critical',
  },
  {
    code: 'ANNUAL_AUDIT',
    name: 'Annual Audit',
    regulation: 'PECG_ACT',
    section: 'Section 36',
    checkType: 'deadline',
    config: {
      frequency: 'annual',
      auditor: 'auditor_general_or_public_auditor',
      required: true,
    },
    severity: 'warning',
  },
];
```

### 4.2 Rule Execution Engine

```typescript
// lib/compliance/pecg-engine.ts
// Pure business logic — no framework imports

export type CheckType = 'deadline' | 'threshold' | 'presence' | 'absence' | 'count' | 'ratio';

export interface ComplianceRule {
  code: string;
  name: string;
  regulation: 'PECG_ACT' | 'ZIMCODE';
  section: string;
  description: string;
  checkType: CheckType;
  config: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical' | 'legal';
}

export interface CheckResult {
  ruleCode: string;
  status: 'compliant' | 'non_compliant' | 'at_risk' | 'waived' | 'not_applicable';
  targetId: string | null;
  targetType: string | null;
  details: Record<string, unknown>;
  dueDate: string | null;
  riskScore: number; // 0-100
}

export class PECGComplianceEngine {
  private rules: ComplianceRule[];

  constructor(rules: ComplianceRule[]) {
    this.rules = rules;
  }

  /**
   * Execute all rules for a given institution
   */
  async executeChecks(
    institutionId: string,
    dataProvider: ComplianceDataProvider
  ): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    for (const rule of this.rules) {
      const result = await this.executeRule(rule, institutionId, dataProvider);
      results.push(result);
    }

    return results;
  }

  private async executeRule(
    rule: ComplianceRule,
    institutionId: string,
    dataProvider: ComplianceDataProvider
  ): Promise<CheckResult> {
    switch (rule.checkType) {
      case 'deadline':
        return this.checkDeadline(rule, institutionId, dataProvider);
      case 'threshold':
        return this.checkThreshold(rule, institutionId, dataProvider);
      case 'presence':
        return this.checkPresence(rule, institutionId, dataProvider);
      case 'absence':
        return this.checkAbsence(rule, institutionId, dataProvider);
      case 'count':
        return this.checkCount(rule, institutionId, dataProvider);
      case 'ratio':
        return this.checkRatio(rule, institutionId, dataProvider);
      default:
        return {
          ruleCode: rule.code,
          status: 'not_applicable',
          targetId: null,
          targetType: null,
          details: { error: 'Unknown check type' },
          dueDate: null,
          riskScore: 0,
        };
    }
  }

  // Individual check implementations...
}
```

---

## 5. Integration with Existing GRC-Nexus Modules

### 5.1 Compliance Module Updates

The existing `compliance_obligations` table will remain as the **manual obligation tracking** layer. The new PECG compliance engine adds an **automated rule-checking layer** on top.

#### Updated Compliance Dashboard
```typescript
// app/(protected)/compliance/page.tsx additions

// New stat cards for PECG compliance
<ComplianceStatCard
  icon={Shield}
  label="PECG Act Score"
  value={`${pecgScore}%`}
  accent={pecgScore >= 80 ? 'text-ok' : pecgScore >= 50 ? 'text-warn' : 'text-err'}
  description="Automated compliance against PECG Act"
/>

<ComplianceStatCard
  icon={Gavel}
  label="ZimCode Score"
  value={`${zimcodeScore}%`}
  accent={zimcodeScore >= 80 ? 'text-ok' : zimcodeScore >= 50 ? 'text-warn' : 'text-err'}
  description="Compliance with ZimCode principles"
/>

<ComplianceStatCard
  icon={AlertTriangle}
  label="Critical Violations"
  value={criticalCount}
  accent={criticalCount > 0 ? 'text-err' : 'text-ok'}
  description="Requires immediate CGU attention"
/>
```

#### New PECG Compliance Page
```
app/(protected)/compliance/pecg/
├── page.tsx                    # PECG compliance overview
├── rules/
│   ├── page.tsx               # List all PECG rules
│   └── [code]/
│       └── page.tsx           # Rule detail & affected institutions
├── checks/
│   ├── page.tsx               # All compliance checks
│   └── [id]/
│       └── page.tsx           # Check detail & evidence
├── declarations/
│   ├── page.tsx               # Asset declarations list
│   └── new/
│       └── page.tsx           # Submit declaration
├── disclosures/
│   ├── page.tsx               # Conflict disclosures
│   └── new/
│       └── page.tsx           # Submit disclosure
├── contracts/
│   ├── page.tsx               # Performance contracts
│   └── new/
│       └── page.tsx           # Create contract
├── plans/
│   ├── page.tsx               # Strategic plans
│   └── new/
│       └── page.tsx           # Submit plan
└── scores/
    └── page.tsx               # Historical compliance scores
```

### 5.2 Board Module Integration

The existing `board_meetings` and `board_resolutions` tables feed into the compliance engine:

```typescript
// lib/compliance/data-providers/board-provider.ts

export class BoardDataProvider {
  async getMeetingCount(institutionId: string, year: number): Promise<number> {
    // Query board_meetings table
  }

  async getLastMeetingDate(institutionId: string): Promise<string | null> {
    // Query board_meetings table
  }

  async getBoardMemberCount(institutionId: string): Promise<number> {
    // Query user_roles for 'board-member' at institution
  }

  async getBoardComposition(institutionId: string): Promise<BoardComposition> {
    // Query user_profiles for gender, civil servant status, etc.
  }
}
```

### 5.3 Incident Module Integration

Link whistleblowing incidents to compliance:

```sql
-- Add compliance_check_id to incident_cases for tracking
alter table public.incident_cases
add column compliance_check_id uuid references public.pecg_compliance_checks(id) on delete set null;
```

### 5.4 Risk Module Integration

PECG compliance risks feed into the risk register:

```sql
-- Link compliance checks to risks
alter table public.risks
add column related_compliance_check_id uuid references public.pecg_compliance_checks(id) on delete set null;
```

### 5.5 Audit Module Integration

Compliance checks provide audit evidence:

```sql
-- Link audit findings to compliance checks
alter table public.audit_findings
add column related_compliance_check_id uuid references public.pecg_compliance_checks(id) on delete set null;
```

---

## 6. AI/ML Enhancement Features

### 6.1 Anomaly Detection

```typescript
// lib/compliance/ai/anomaly-detection.ts

export class GovernanceAnomalyDetector {
  /**
   * Detect unusual patterns in governance data
   */
  async detectAnomalies(institutionId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Pattern 1: Sudden board member resignations
    const resignations = await this.getRecentResignations(institutionId, 90);
    if (resignations.length >= 3) {
      anomalies.push({
        type: 'mass_resignation',
        severity: 'high',
        description: `${resignations.length} board members resigned in 90 days`,
        riskScore: 85,
      });
    }

    // Pattern 2: Repeated meeting postponements
    const postponements = await this.getPostponedMeetings(institutionId, 180);
    if (postponements.length >= 2) {
      anomalies.push({
        type: 'meeting_disruption',
        severity: 'medium',
        description: `${postponements.length} meetings postponed in 180 days`,
        riskScore: 60,
      });
    }

    // Pattern 3: Delayed financial disclosures
    const delayedDisclosures = await this.getDelayedDisclosures(institutionId);
    if (delayedDisclosures.length > 0) {
      anomalies.push({
        type: 'disclosure_delay',
        severity: 'high',
        description: `${delayedDisclosures.length} disclosures delayed`,
        riskScore: 75,
      });
    }

    return anomalies;
  }
}
```

### 6.2 Predictive Risk Scoring

```typescript
// lib/compliance/ai/risk-scoring.ts

export interface InstitutionRiskProfile {
  institutionId: string;
  overallRiskScore: number;      // 0-100
  complianceRiskScore: number;  // 0-100
  governanceRiskScore: number;  // 0-100
  financialRiskScore: number;   // 0-100
  trend: 'improving' | 'stable' | 'deteriorating';
  predictions: RiskPrediction[];
}

export class PredictiveRiskScorer {
  /**
   * Calculate predictive risk score for an institution
   */
  async calculateRiskProfile(institutionId: string): Promise<InstitutionRiskProfile> {
    // Historical compliance data
    const historicalScores = await this.getHistoricalScores(institutionId, 12);
    
    // Current compliance status
    const currentChecks = await this.getCurrentChecks(institutionId);
    
    // Board stability metrics
    const boardMetrics = await this.getBoardMetrics(institutionId);
    
    // Meeting regularity
    const meetingMetrics = await this.getMeetingMetrics(institutionId);
    
    // Calculate trend
    const trend = this.calculateTrend(historicalScores);
    
    // Generate predictions
    const predictions = this.generatePredictions(
      historicalScores,
      currentChecks,
      boardMetrics,
      meetingMetrics
    );

    return {
      institutionId,
      overallRiskScore: this.computeOverallRisk(...),
      complianceRiskScore: this.computeComplianceRisk(...),
      governanceRiskScore: this.computeGovernanceRisk(...),
      financialRiskScore: this.computeFinancialRisk(...),
      trend,
      predictions,
    };
  }
}
```

### 6.3 NLP Document Analysis

```typescript
// lib/compliance/ai/nlp-analysis.ts

export class GovernanceDocumentAnalyzer {
  /**
   * Analyze board meeting minutes for governance concerns
   */
  async analyzeMeetingMinutes(minutesText: string): Promise<NlpAnalysisResult> {
    const concerns: GovernanceConcern[] = [];

    // Detect conflict of interest mentions without proper recusal
    const conflictMentions = this.extractConflictMentions(minutesText);
    for (const mention of conflictMentions) {
      if (!mention.hasRecusal) {
        concerns.push({
          type: 'conflict_without_recusal',
          severity: 'critical',
          text: mention.text,
          recommendation: 'Ensure board member recused themselves from discussion and voting',
        });
      }
    }

    // Detect unapproved expenditure mentions
    const expenditureMentions = this.extractExpenditureMentions(minutesText);
    for (const mention of expenditureMentions) {
      if (!mention.hasApproval) {
        concerns.push({
          type: 'unapproved_expenditure',
          severity: 'high',
          text: mention.text,
          recommendation: 'Verify expenditure was properly approved by board',
        });
      }
    }

    return { concerns };
  }
}
```

---

## 7. Escalation & Notification System

### 7.1 Escalation Thresholds

```typescript
// lib/compliance/escalation.ts

export const PECG_ESCALATION_THRESHOLDS = {
  // Critical violations (immediate CGU notification)
  CRITICAL: [
    'TERM_LIMIT_BREACH',
    'MEMBERSHIP_LIMIT_BREACH',
    'PROHIBITED_LOANS',
    'CONFLICT_WITHOUT_RECUSAL',
    'PERFORMANCE_CONTRACT_MISSING',
  ],
  // Warning (line ministry notification)
  WARNING: [
    'QUARTERLY_MEETINGS_MISSED',
    'ASSET_DECLARATION_OVERDUE',
    'STRATEGIC_PLAN_EXPIRED',
    'GENDER_REPRESENTATION_LOW',
  ],
  // Info (entity self-correction)
  INFO: [
    'BOARD_CHARTER_REVIEW_DUE',
    'CODE_OF_ETHICS_REVIEW_DUE',
    'ANNUAL_REVIEW_UPCOMING',
  ],
};

export async function escalatePecgViolation(
  checkResult: CheckResult,
  institutionId: string
): Promise<void> {
  const severity = getViolationSeverity(checkResult.ruleCode);
  
  switch (severity) {
    case 'critical':
      // Immediate notification to CGU + line ministry + entity CEO
      await notifyCGU(checkResult, institutionId);
      await notifyLineMinistry(checkResult, institutionId);
      await notifyCEO(checkResult, institutionId);
      break;
    case 'warning':
      // Notification to line ministry + entity
      await notifyLineMinistry(checkResult, institutionId);
      await notifyCEO(checkResult, institutionId);
      break;
    case 'info':
      // Reminder to entity only
      await notifyCEO(checkResult, institutionId);
      break;
  }
}
```

### 7.2 Notification Templates

```typescript
// lib/compliance/notifications.ts

export const PECG_NOTIFICATION_TEMPLATES = {
  CRITICAL_VIOLATION: {
    subject: 'URGENT: PECG Act Compliance Violation — {institutionName}',
    body: `
      A critical compliance violation has been detected:
      
      Rule: {ruleName}
      Institution: {institutionName}
      Severity: CRITICAL
      Details: {details}
      
      Immediate action is required. Please review in the CGU-MIS system.
    `,
  },
  WARNING: {
    subject: 'PECG Act Compliance Warning — {institutionName}',
    body: `
      A compliance warning has been issued:
      
      Rule: {ruleName}
      Institution: {institutionName}
      Due Date: {dueDate}
      
      Please take corrective action before the deadline.
    `,
  },
  SCORE_UPDATE: {
    subject: 'Monthly Compliance Score Update — {institutionName}',
    body: `
      Your institution's compliance score has been updated:
      
      Overall Score: {overallScore}%
      PECG Act Score: {pecgScore}%
      ZimCode Score: {zimcodeScore}%
      Risk Level: {riskLevel}
      
      View detailed breakdown in the CGU-MIS dashboard.
    `,
  },
};
```

---

## 8. Implementation Timeline

### Phase 1: Foundation (Weeks 1-4)
- [ ] Create database schema extensions (migrations)
- [ ] Seed PECG Act and ZimCode compliance rules
- [ ] Build core compliance engine (rule execution framework)
- [ ] Implement basic check types (deadline, presence, count, ratio, threshold)

### Phase 2: Data Integration (Weeks 5-8)
- [ ] Build data providers for existing tables (board, meetings, obligations)
- [ ] Create asset declaration module
- [ ] Create strategic plan module
- [ ] Create disclosure module
- [ ] Create performance contract module

### Phase 3: UI Development (Weeks 9-12)
- [ ] PECG compliance dashboard
- [ ] Compliance rules viewer
- [ ] Check detail pages with evidence upload
- [ ] Asset declaration submission forms
- [ ] Disclosure submission forms
- [ ] Performance contract management
- [ ] Strategic plan management

### Phase 4: AI/ML Enhancement (Weeks 13-16)
- [ ] Anomaly detection engine
- [ ] Predictive risk scoring
- [ ] NLP document analysis for board minutes
- [ ] Automated compliance score calculation
- [ ] Trend analysis and forecasting

### Phase 5: Integration & Polish (Weeks 17-20)
- [ ] Escalation workflow integration
- [ ] Notification system (email, in-app)
- [ ] CGU oversight dashboard
- [ ] Line ministry compliance views
- [ ] Audit trail integration
- [ ] Performance testing and optimization

---

## 9. GRC-Nexus Code Alignment

### 9.1 File Structure
```
lib/compliance/
├── queries.ts                    # Existing (unchanged)
├── compliance-utils.ts           # Existing (add PECG helpers)
├── pecg-engine.ts               # NEW: Core compliance engine
├── pecg-rules.ts                # NEW: Rule definitions
├── pecg-data-providers.ts       # NEW: Data providers
├── pecg-score-calculator.ts     # NEW: Score calculation
├── pecg-escalation.ts          # NEW: Escalation logic
├── pecg-notifications.ts       # NEW: Notification templates
├── ai/
│   ├── anomaly-detection.ts     # NEW
│   ├── risk-scoring.ts          # NEW
│   └── nlp-analysis.ts          # NEW
└── types.ts                     # NEW: PECG-specific types

app/(protected)/compliance/
├── page.tsx                      # Existing (add PECG stat cards)
├── obligations/                # Existing (unchanged)
└── pecg/                        # NEW: PECG compliance pages
    ├── page.tsx
    ├── rules/
    ├── checks/
    ├── declarations/
    ├── disclosures/
    ├── contracts/
    ├── plans/
    └── scores/

types/compliance.ts               # Existing (add PECG types)
```

### 9.2 Type Extensions
```typescript
// types/compliance.ts additions

export type PECGRuleCode =
  | 'TERM_LIMIT'
  | 'MEMBERSHIP_LIMIT'
  | 'GENDER_REPRESENTATION'
  | 'CIVIL_SERVANT_RESTRICTION'
  | 'DATABASE_INCLUSION'
  | 'QUARTERLY_MEETINGS'
  | 'AGM_REQUIRED'
  | 'CONFLICT_DISCLOSURE'
  | 'STRATEGIC_PLAN'
  | 'PERFORMANCE_CONTRACT_BOARD'
  | 'PERFORMANCE_CONTRACT_CEO'
  | 'ANNUAL_REVIEW'
  | 'BOARD_CHARTER'
  | 'CODE_OF_ETHICS'
  | 'ASSET_DECLARATION'
  | 'RISK_COMMITTEE'
  | 'WHISTLEBLOWING_SYSTEM'
  | 'PAY_CAP'
  | 'STANDARDIZED_ALLOWANCES'
  | 'PROHIBITED_LOANS'
  | 'ANNUAL_AUDIT';

export type PECGCheckStatus = 'compliant' | 'non_compliant' | 'at_risk' | 'waived' | 'not_applicable';

export type PECGRuleSeverity = 'info' | 'warning' | 'critical' | 'legal';

export type PECGRiskLevel = 'low' | 'medium' | 'high' | 'critical';
```

### 9.3 Migration Files
```
supabase/migrations/
├── 20260605000001_pecg_compliance_schema.sql      # New tables
├── 20260605000002_pecg_compliance_rls.sql         # RLS policies
├── 20260605000003_pecg_compliance_triggers.sql    # Audit triggers
├── 20260605000004_pecg_rules_seed.sql             # Seed rules
├── 20260605000005_pecg_board_integration.sql       # Board module links
└── 20260605000006_pecg_incident_integration.sql    # Incident module links
```

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rule Coverage | 100% of PECG Act sections | Count of codified rules |
| Automation Rate | 90% of checks automated | Automated vs manual checks |
| Detection Speed | < 24 hours from violation | Time to detect |
| False Positive Rate | < 5% | Incorrect alerts / total alerts |
| Institution Coverage | 100% of public entities | Entities with compliance scores |
| CGU Response Time | < 48 hours for critical violations | Time from alert to CGU action |
| Compliance Score Trend | 10% improvement per quarter | Average institution score |

---

## 11. Security & Compliance Considerations

1. **Data Sovereignty** — All governance data remains in Zimbabwe, hosted in government-controlled infrastructure
2. **ISO 27001 Alignment** — BI4YOU's certification ensures the engine meets international security standards
3. **Audit Trail Immutability** — All compliance checks, scores, and actions are append-only with cryptographic hashing
4. **Role-Based Access** — CGU staff, line ministries, and entity staff have differentiated access levels
5. **Data Privacy** — Asset declarations and personal information are encrypted at rest and in transit

---

## Conclusion

This plan provides a comprehensive roadmap to build a PECG Act compliance engine within GRC-Nexus that:
- **Automates** compliance monitoring against all PECG Act and ZimCode requirements
- **Integrates** seamlessly with existing GRC-Nexus modules (compliance, board, risk, audit, incident)
- **Predicts** governance risks before they become violations
- **Escalates** critical violations to CGU and relevant stakeholders automatically
- **Provides** a single source of truth for corporate governance compliance across all Zimbabwean public entities

The implementation follows the existing GRC-Nexus architectural patterns (RLS, audit triggers, append-only attestations, Supabase integration) and can be delivered in 20 weeks across 5 phases.
