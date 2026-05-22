# Architecture Research: GRC-Nexus

**Project:** GRC-Nexus (Governance, Risk, Compliance Platform)
**Scope:** Next.js 14 App Router + Supabase + Single Institution (Prototype)
**Researched:** 2026-05-22

---

## Executive Summary

GRC-Nexus requires a **server-first, role-gated architecture** where:

1. **Next.js App Router** organizes multi-module functionality as feature-based route groups with shared data access layers
2. **Supabase RLS** enforces authorization at the database layer using JWT custom claims mapped to GRC roles
3. **Server Components** handle data fetching and business logic; **Client Components** stay at interaction boundaries
4. **Entity relationships** cascade from Institutions → Users → Roles → Data Access, with all governance objects tagged to strategic objectives
5. **Build order** prioritizes Auth + RLS setup first, then core entities (KPIs, Risks, Compliance), then interactive features

This architecture supports the prototype scope (single institution, core integrity stack) while positioning for multi-tenant expansion.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 14 App Router (Frontend)             │
├──────────┬──────────────┬──────────────┬──────────────┬─────────┤
│Dashboard │    Risk      │  Compliance  │    Board     │  Audit  │
│ (home)   │  Management  │  Management  │  Management  │ & Cases │
└──────────┴──────────────┴──────────────┴──────────────┴─────────┘
           ↓ Server Components (data fetching, RLS applied)
┌─────────────────────────────────────────────────────────────────┐
│              Supabase Auth + RLS Middleware Layer                │
│  • JWT Custom Claims (role, institution_id, department_id)      │
│  • Middleware.ts: token refresh, auth gate                       │
│  • Row-Level Security policies on all tables                     │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL Database                    │
├──────────────────────────────────────────────────────────────────┤
│ Core Tables: institutions, users, roles, role_assignments       │
│ Strategy:   objectives, kpis, kpi_readings                      │
│ Risk:       risks, risk_treatments, controls                    │
│ Compliance: obligations, evidence, attestations                 │
│ Governance: board_meetings, agendas, resolutions, actions      │
│ Audit:      audit_findings, remediation_plans, closures        │
│ Cases:      incidents, case_investigations                      │
├──────────────────────────────────────────────────────────────────┤
│             Supabase Storage (Private Buckets)                    │
│ • board_packs/      (agenda, resolutions, decision docs)        │
│ • compliance_evidence/ (attestation uploads)                    │
│ • audit_findings/   (investigation files)                       │
│ • policies/         (policy documents, sign-off records)        │
│ • incident_files/   (case investigation confidential files)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next.js App Router Structure

### Directory Organization (Feature-Module Pattern)

```
app/
├── layout.tsx                          # Root layout (auth boundary)
├── middleware.ts                       # Token refresh + auth gating
├── (auth)/
│   ├── login/
│   │   └── page.tsx                   # Login form
│   ├── signup/
│   │   └── page.tsx                   # Signup (if applicable)
│   └── callback/
│       └── route.ts                   # OAuth callback handler
├── (protected)/                        # Route group requiring auth
│   ├── layout.tsx                     # Protected layout (sidebar, nav)
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Executive dashboard (home)
│   │   ├── _components/
│   │   │   ├── risk-heatmap.tsx       # Client component
│   │   │   ├── kpi-summary.tsx        # Client component
│   │   │   └── compliance-posture.tsx # Client component
│   │   ├── _lib/
│   │   │   ├── dashboard.queries.ts   # Server-side data fetching
│   │   │   └── dashboard.types.ts
│   │   └── loading.tsx                # Skeleton while loading
│   ├── risk/
│   │   ├── layout.tsx                 # Risk module layout
│   │   ├── page.tsx                   # Risk register (list page)
│   │   ├── [id]/
│   │   │   ├── page.tsx               # Risk detail view
│   │   │   └── _components/
│   │   │       ├── risk-form.tsx      # Client component (edit)
│   │   │       └── treatment-plan.tsx # Client component
│   │   ├── _components/
│   │   │   ├── risk-table.tsx         # Client component (data table)
│   │   │   └── create-risk-button.tsx # Client component
│   │   ├── _lib/
│   │   │   ├── risk.queries.ts        # Server-side queries
│   │   │   ├── risk.actions.ts        # Server Actions (mutations)
│   │   │   └── risk.types.ts
│   │   └── error.tsx
│   ├── compliance/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Compliance obligations list
│   │   ├── [id]/
│   │   │   ├── page.tsx               # Obligation detail
│   │   │   └── _components/
│   │   │       └── evidence-upload.tsx # Client component
│   │   ├── _lib/
│   │   │   ├── compliance.queries.ts
│   │   │   ├── compliance.actions.ts  # Upload, attest
│   │   │   └── compliance.types.ts
│   │   └── error.tsx
│   ├── board/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Board meetings list
│   │   ├── [meeting_id]/
│   │   │   ├── page.tsx               # Meeting detail (pack viewer)
│   │   │   └── _components/
│   │   │       ├── agenda-panel.tsx   # Client component
│   │   │       └── resolution-form.tsx # Client component
│   │   ├── _lib/
│   │   │   ├── board.queries.ts
│   │   │   ├── board.actions.ts       # Resolution, action tracking
│   │   │   └── board.types.ts
│   │   └── error.tsx
│   ├── audit/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Audit findings dashboard
│   │   ├── [finding_id]/
│   │   │   ├── page.tsx               # Finding detail
│   │   │   └── _components/
│   │   │       └── remediation-form.tsx # Client component
│   │   ├── _lib/
│   │   │   ├── audit.queries.ts
│   │   │   ├── audit.actions.ts
│   │   │   └── audit.types.ts
│   │   └── error.tsx
│   ├── incidents/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Incident/whistleblower list
│   │   ├── [case_id]/
│   │   │   ├── page.tsx               # Case detail (auth-gated)
│   │   │   └── _components/
│   │   │       └── investigation.tsx  # Client component
│   │   ├── _lib/
│   │   │   ├── incidents.queries.ts
│   │   │   ├── incidents.actions.ts
│   │   │   └── incidents.types.ts
│   │   └── error.tsx
│   └── settings/
│       ├── layout.tsx
│       ├── page.tsx                   # Org & personal settings
│       ├── users/
│       │   ├── page.tsx               # User management
│       │   └── _components/
│       │       └── user-form.tsx
│       ├── roles/
│       │   ├── page.tsx               # Role definitions (admin only)
│       │   └── _components/
│       │       └── role-form.tsx
│       ├── _lib/
│       │   ├── settings.queries.ts
│       │   ├── settings.actions.ts
│       │   └── settings.types.ts
│       └── error.tsx
├── api/
│   └── route-handlers/                # Route handlers for external webhooks only
│       └── audit-log/
│           └── route.ts               # Accept external audit events (if needed)
├── not-found.tsx
└── error.tsx

lib/
├── supabase/
│   ├── server.ts                      # Server-side Supabase client
│   ├── client.ts                      # Client-side Supabase client
│   ├── middleware.ts                  # Middleware Supabase client
│   └── auth.ts                        # Auth helper functions
├── auth/
│   ├── rls-context.ts                 # JWT claim utilities
│   ├── roles.ts                       # Role permission definitions
│   └── middleware-auth.ts             # Middleware auth checks
├── utils/
│   ├── validators.ts                  # Zod schemas
│   ├── errors.ts                      # Error handling
│   └── formatting.ts                  # Date, number formatting
└── types/
    ├── supabase.ts                    # Auto-generated types (or manual)
    └── domain.ts                      # GRC domain types
```

### Key Structural Decisions

**1. Feature Modules as Route Groups**
- Each major feature (risk, compliance, board, audit, incidents) is a route group with nested layout, pages, and components
- Colocates related UI components (`_components/`) and queries (`_lib/`) with their routes
- Avoids scattered actions and hooks across the project

**2. Separation of Concerns**
- `page.tsx` → List/summary views (Server Component by default)
- `[id]/page.tsx` → Detail views (Server Component, fetches context-specific data)
- `_components/` → Interactive components (marked with `'use client'` when needed)
- `_lib/` → Data fetching (server-side queries), Server Actions (mutations), and types

**3. Shared Libraries**
- `lib/supabase/` → Client factory functions (server, client, middleware)
- `lib/auth/` → JWT claim parsing, role permission checks
- `lib/types/` → Shared TypeScript types for consistency

**4. Auth Boundary**
- `(auth)/` → Unauthenticated routes (login, callback)
- `(protected)/` → All authenticated routes (middleware enforces auth)
- Root layout applies `Suspense` boundaries for streaming

---

## Supabase Data Model (Core Schema)

### Entity Relationship Overview

```
institutions (tenants)
  └─ users
      ├─ role_assignments → roles
      └─ user_departments
          └─ departments (hierarchical)

objectives (strategic, hierarchical)
  ├─ kpis
  │   └─ kpi_readings (timeseries)
  └─ risks
      ├─ risk_treatments
      │   └─ control_instances
      │       └─ control_tests
      └─ risk_controls (junction: risks ↔ controls)

compliance
  ├─ compliance_obligations (statutory)
  │   ├─ evidence (uploads)
  │   └─ attestations
  └─ policies (with sign-off tracking)

governance
  ├─ board_meetings
  │   ├─ agendas
  │   ├─ resolutions
  │   ├─ actions (tracked to completion)
  │   └─ board_packs (document bundles)
  └─ ceo_contracts (performance agreements)

audit
  ├─ audit_findings
  │   ├─ root_causes
  │   ├─ remediation_plans
  │   └─ remediation_actions
  └─ audit_observations (observations vs findings)

cases (incident/whistleblower)
  ├─ incidents (intake)
  ├─ case_investigations (confidential workflows)
  └─ case_closures (evidence of resolution)
```

### Core Tables (Simplified DDL Pattern)

```sql
-- Tenancy & Authentication
CREATE TABLE institutions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT, -- MDA, SOE, etc.
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE users (
  id UUID PRIMARY KEY (auth.uid),
  institution_id UUID REFERENCES institutions,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  department_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  name TEXT NOT NULL, -- board, ceo, risk_officer, audit_officer, dept_head, admin
  permissions JSONB, -- {can_create_risk: true, can_approve_evidence: true, ...}
  created_at TIMESTAMP
);

CREATE TABLE role_assignments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  role_id UUID REFERENCES roles,
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES users,
  valid_until TIMESTAMP
);

-- Strategy & KPI
CREATE TABLE objectives (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  nds2_pillar TEXT, -- NDS2 alignment
  objective_text TEXT NOT NULL,
  owner_id UUID REFERENCES users,
  parent_objective_id UUID, -- hierarchical
  baseline_year INT,
  created_at TIMESTAMP
);

CREATE TABLE kpis (
  id UUID PRIMARY KEY,
  objective_id UUID REFERENCES objectives,
  kpi_name TEXT NOT NULL,
  baseline DECIMAL,
  target DECIMAL,
  owner_id UUID REFERENCES users,
  reporting_period TEXT, -- quarterly, annual
  created_at TIMESTAMP
);

CREATE TABLE kpi_readings (
  id UUID PRIMARY KEY,
  kpi_id UUID REFERENCES kpis,
  period_end_date DATE,
  actual_value DECIMAL,
  status TEXT, -- on-track, at-risk, off-track
  recorded_by UUID REFERENCES users,
  recorded_at TIMESTAMP
);

-- Risk Management
CREATE TABLE risks (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  objective_id UUID REFERENCES objectives,
  risk_description TEXT NOT NULL,
  risk_owner_id UUID REFERENCES users,
  inherent_likelihood INT, -- 1-5
  inherent_impact INT, -- 1-5
  residual_likelihood INT,
  residual_impact INT,
  risk_appetite_score INT,
  status TEXT, -- open, mitigated, closed
  created_at TIMESTAMP
);

CREATE TABLE risk_treatments (
  id UUID PRIMARY KEY,
  risk_id UUID REFERENCES risks,
  treatment_type TEXT, -- reduce, avoid, accept, share
  treatment_description TEXT,
  owner_id UUID REFERENCES users,
  target_completion DATE,
  status TEXT, -- in-progress, completed, overdue
  created_at TIMESTAMP
);

CREATE TABLE controls (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  control_name TEXT NOT NULL,
  control_type TEXT, -- preventive, detective, compensating
  owner_id UUID REFERENCES users
);

CREATE TABLE risk_controls (
  risk_id UUID REFERENCES risks,
  control_id UUID REFERENCES controls,
  PRIMARY KEY (risk_id, control_id)
);

-- Compliance
CREATE TABLE compliance_obligations (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  obligation_type TEXT, -- statutory, policy, best-practice
  regulation TEXT, -- e.g., PECOGA Sec. 25, PPDPA
  requirement_text TEXT NOT NULL,
  due_date DATE,
  owner_id UUID REFERENCES users,
  status TEXT, -- pending, complied, non-compliant, in-review
  created_at TIMESTAMP
);

CREATE TABLE evidence (
  id UUID PRIMARY KEY,
  obligation_id UUID REFERENCES compliance_obligations,
  evidence_type TEXT, -- document, attestation, control test result
  file_path TEXT, -- supabase storage path
  uploaded_by UUID REFERENCES users,
  uploaded_at TIMESTAMP,
  valid_until TIMESTAMP
);

CREATE TABLE attestations (
  id UUID PRIMARY KEY,
  obligation_id UUID REFERENCES compliance_obligations,
  attested_by UUID REFERENCES users,
  attested_at TIMESTAMP,
  status TEXT, -- pending, attested, exceptions-noted
  exceptions_text TEXT
);

-- Board & Governance
CREATE TABLE board_meetings (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  meeting_date DATE,
  created_by UUID REFERENCES users,
  status TEXT, -- scheduled, held, cancelled,
  minutes_approved BOOLEAN,
  approved_by UUID REFERENCES users,
  created_at TIMESTAMP
);

CREATE TABLE agendas (
  id UUID PRIMARY KEY,
  board_meeting_id UUID REFERENCES board_meetings,
  agenda_item TEXT,
  presenter_id UUID REFERENCES users,
  sequence INT,
  created_at TIMESTAMP
);

CREATE TABLE resolutions (
  id UUID PRIMARY KEY,
  board_meeting_id UUID REFERENCES board_meetings,
  resolution_text TEXT NOT NULL,
  voting_result TEXT, -- unanimous, majority, split, deferred
  created_at TIMESTAMP
);

CREATE TABLE board_actions (
  id UUID PRIMARY KEY,
  resolution_id UUID REFERENCES resolutions,
  action_text TEXT NOT NULL,
  responsible_id UUID REFERENCES users,
  due_date DATE,
  status TEXT, -- open, in-progress, completed, overdue
  created_at TIMESTAMP
);

CREATE TABLE board_packs (
  id UUID PRIMARY KEY,
  board_meeting_id UUID REFERENCES board_meetings,
  pack_name TEXT,
  file_path TEXT, -- supabase storage
  uploaded_at TIMESTAMP
);

-- Audit
CREATE TABLE audit_findings (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  finding_title TEXT NOT NULL,
  finding_description TEXT,
  priority TEXT, -- high, medium, low
  owner_id UUID REFERENCES users,
  status TEXT, -- open, in-remediation, closed, closed-verified
  created_at TIMESTAMP
);

CREATE TABLE remediation_plans (
  id UUID PRIMARY KEY,
  finding_id UUID REFERENCES audit_findings,
  action_text TEXT,
  responsible_id UUID REFERENCES users,
  target_date DATE,
  status TEXT, -- planned, in-progress, completed, overdue
  created_at TIMESTAMP
);

-- Incident / Whistleblower / Case Management
CREATE TABLE incidents (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  intake_date TIMESTAMP,
  report_type TEXT, -- whistleblower, hr-concern, compliance-issue, fraud-allegation
  description TEXT,
  reported_by_id UUID REFERENCES users, -- null if anonymous
  status TEXT, -- intake, triage, investigation, resolved, closed
  created_at TIMESTAMP
);

CREATE TABLE case_investigations (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES incidents,
  investigator_id UUID REFERENCES users,
  investigation_notes TEXT,
  status TEXT, -- open, in-progress, completed
  created_at TIMESTAMP
);

-- Shared Audit Trail (if not using Postgres triggers)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions,
  table_name TEXT,
  record_id UUID,
  action TEXT, -- insert, update, delete
  changed_by UUID REFERENCES users,
  old_values JSONB,
  new_values JSONB,
  changed_at TIMESTAMP
);
```

### Indexing Strategy (Performance)

```sql
-- RLS policy columns (MUST be indexed)
CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_objectives_institution ON objectives(institution_id);
CREATE INDEX idx_risks_institution ON risks(institution_id);
CREATE INDEX idx_compliance_obligations_institution ON compliance_obligations(institution_id);
CREATE INDEX idx_board_meetings_institution ON board_meetings(institution_id);
CREATE INDEX idx_audit_findings_institution ON audit_findings(institution_id);
CREATE INDEX idx_incidents_institution ON incidents(institution_id);

-- Commonly filtered columns
CREATE INDEX idx_kpis_objective ON kpis(objective_id);
CREATE INDEX idx_risk_treatments_risk ON risk_treatments(risk_id);
CREATE INDEX idx_compliance_evidence_obligation ON evidence(obligation_id);
CREATE INDEX idx_board_actions_resolution ON board_actions(resolution_id);
CREATE INDEX idx_remediation_finding ON remediation_plans(finding_id);

-- Owner/user lookups
CREATE INDEX idx_risks_owner ON risks(risk_owner_id);
CREATE INDEX idx_objectives_owner ON objectives(owner_id);
CREATE INDEX idx_board_meetings_creator ON board_meetings(created_by);
```

---

## Role-Based Access Control (RBAC) via Supabase RLS

### JWT Custom Claims Structure

When a user logs in, Supabase Auth can include custom claims in their JWT via a **Custom Access Token Auth Hook** (Postgres function). This happens at token generation time.

```typescript
// Example JWT payload structure after login:
{
  sub: "user-uuid",
  email: "officer@institution.gov.zw",
  role: "risk_officer",           // Custom claim
  institution_id: "inst-uuid",    // Custom claim
  department_id: "dept-uuid",     // Custom claim (optional)
  aud: "authenticated",
  iat: 1716432000,
  exp: 1716518400,
  ...
}
```

### Setting Custom Claims (via Postgres Hook)

Create an **Auth Hook** in Supabase using a Postgres function that fires before JWT issuance:

```sql
-- Function to populate custom claims into JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_institution_id uuid;
  user_department_id uuid;
BEGIN
  -- Fetch user's current role and institution
  SELECT r.name, u.institution_id, u.department_id
  INTO user_role, user_institution_id, user_department_id
  FROM public.users u
  LEFT JOIN public.role_assignments ra ON u.id = ra.user_id
    AND ra.valid_until IS NULL OR ra.valid_until > now()
  LEFT JOIN public.roles r ON ra.role_id = r.id
  WHERE u.id = event->'user_id'::uuid
  LIMIT 1;

  -- Build JWT claims
  claims := event->'claims'::jsonb;
  claims := jsonb_set(claims, '{role}', to_jsonb(COALESCE(user_role, 'user')));
  claims := jsonb_set(claims, '{institution_id}', to_jsonb(user_institution_id));
  claims := jsonb_set(claims, '{department_id}', to_jsonb(user_department_id));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
```

Register this hook in Supabase console under Auth > Hooks > Custom Access Token.

### GRC Roles and Permission Model

```typescript
// lib/auth/roles.ts

export const GRC_ROLES = {
  ADMIN: 'admin',                    // Full system access
  BOARD_MEMBER: 'board',             // Board oversight functions
  CEO: 'ceo',                        // CEO/AO level (strategy + board)
  RISK_OFFICER: 'risk_officer',      // ERM module leadership
  AUDIT_OFFICER: 'audit_officer',    // Audit & findings leadership
  COMPLIANCE_OFFICER: 'compliance_officer', // Policy & compliance
  DEPT_HEAD: 'dept_head',            // Departmental execution
  INVESTIGATOR: 'investigator',      // Case investigation (confidential)
  USER: 'user',                      // Basic authenticated user
};

export const ROLE_PERMISSIONS = {
  admin: {
    // Full access
    can_read_all: true,
    can_write_all: true,
    can_delete_all: true,
    can_manage_users: true,
    can_manage_roles: true,
  },
  board: {
    can_view_board: true,
    can_view_strategy: true,
    can_view_risk_summary: true,
    can_approve_resolutions: true,
    can_view_compliance_posture: true,
  },
  ceo: {
    can_view_all_summaries: true,
    can_approve_resolutions: true,
    can_view_board: true,
    can_view_audit_findings: true,
    can_view_risk_register: true,
  },
  risk_officer: {
    can_create_risk: true,
    can_update_risk: true,
    can_view_risks: true,
    can_create_treatment: true,
    can_approve_treatment: true,
  },
  audit_officer: {
    can_create_finding: true,
    can_view_findings: true,
    can_update_finding: true,
    can_view_remediation: true,
  },
  compliance_officer: {
    can_create_obligation: true,
    can_view_obligations: true,
    can_approve_evidence: true,
    can_create_policy: true,
  },
  dept_head: {
    can_read_own_objectives: true,
    can_update_kpi_readings: true,
    can_view_own_risks: true,
    can_submit_evidence: true,
  },
  investigator: {
    can_view_assigned_cases: true,
    can_update_case_investigation: true,
    can_view_confidential_files: true,
  },
  user: {
    can_view_own_profile: true,
    can_view_assigned_actions: true,
  },
};
```

### RLS Policy Patterns

**Pattern 1: Single Institution Access (Prototype Scope)**

```sql
-- Users can only see/modify data for their own institution
CREATE POLICY institution_isolation ON risks
FOR SELECT USING (
  institution_id = (auth.jwt()->>'institution_id')::uuid
);

CREATE POLICY institution_isolation_insert ON risks
FOR INSERT WITH CHECK (
  institution_id = (auth.jwt()->>'institution_id')::uuid
);

-- Updates restricted to role + institution
CREATE POLICY risks_update_by_owner_or_admin ON risks
FOR UPDATE USING (
  institution_id = (auth.jwt()->>'institution_id')::uuid
  AND (
    risk_owner_id = auth.uid()
    OR (auth.jwt()->>'role') = 'admin'
    OR (auth.jwt()->>'role') = 'ceo'
    OR (auth.jwt()->>'role') = 'risk_officer'
  )
);
```

**Pattern 2: Department-Scoped Access**

```sql
-- Dept heads see only their department's data
CREATE POLICY dept_scope ON kpi_readings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM kpis k
    JOIN objectives o ON k.objective_id = o.id
    WHERE k.id = kpi_readings.kpi_id
    AND (
      o.owner_id = auth.uid()  -- KPI owner
      OR (auth.jwt()->>'role') IN ('admin', 'ceo')
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.department_id = o.department_id
      )
    )
  )
);
```

**Pattern 3: Confidential Case Access (Investigator + Admin Only)**

```sql
-- Case files only visible to assigned investigator + admin
CREATE POLICY confidential_case_access ON case_investigations
FOR SELECT USING (
  investigator_id = auth.uid()
  OR (auth.jwt()->>'role') = 'admin'
  OR (auth.jwt()->>'role') = 'audit_officer'
);

-- Whistleblower intake requires anonymity (reporter_id visible only to audit/admin)
CREATE POLICY anonymous_incident_intake ON incidents
FOR SELECT USING (
  -- Admin/audit can see all
  (auth.jwt()->>'role') IN ('admin', 'audit_officer')
  OR (
    -- Reporter can see own incident
    reported_by_id = auth.uid()
  )
);
```

**Pattern 4: Attestation Approval Workflow**

```sql
-- Compliance officer can approve evidence for obligations in their scope
CREATE POLICY attestation_approval ON attestations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM compliance_obligations co
    WHERE co.id = attestations.obligation_id
    AND (
      co.owner_id = auth.uid()
      OR (auth.jwt()->>'role') IN ('compliance_officer', 'admin')
    )
  )
);
```

### Pattern Summary Table

| Access Pattern | JWT Claim Used | Scope Boundary | Example |
|---|---|---|---|
| Institution isolation | `institution_id` | All core objects | Risk registers by institution |
| Department scoping | `department_id` | KPIs, objectives, actions | Dept head sees own dept KPIs |
| Role-based features | `role` | Feature access | Board module restricted to board/CEO/admin |
| Ownership gates | user `id` (auth.uid()) | Edit/delete | Risk owner or risk officer can update |
| Confidential workflows | combination | Investigator + admin-role | Case files, whistleblower anonymity |

---

## Component Architecture: Server vs Client Patterns

### Principle: Push `'use client'` to the Leaves

Default: **Server Components** (async, direct DB access, security)  
Exception: Wrap interactive elements in Client Components (forms, modals, charts)

### Pattern Examples

#### Pattern 1: Dashboard with Server Data + Client Charts

```typescript
// app/dashboard/page.tsx (Server Component)
import { getRiskHeatmapData, getCompliancePosture, getKPISummary } from '@/lib/dashboard.queries';
import RiskHeatmapChart from './_components/risk-heatmap';
import ComplianceWidget from './_components/compliance-widget';
import KPICard from './_components/kpi-card';
import { Suspense } from 'react';

export default async function DashboardPage() {
  // Server: Fetch all data with RLS applied
  const [heatmapData, complianceData, kpiData] = await Promise.all([
    getRiskHeatmapData(),
    getCompliancePosture(),
    getKPISummary(),
  ]);

  return (
    <div className="space-y-6">
      <h1>Executive Dashboard</h1>
      
      {/* Suspend each widget for independent streaming */}
      <Suspense fallback={<RiskHeatmapSkeleton />}>
        {/* Pass data down; chart component handles interactivity */}
        <RiskHeatmapChart data={heatmapData} />
      </Suspense>

      <Suspense fallback={<ComplianceSkeletonLoader />}>
        <ComplianceWidget data={complianceData} />
      </Suspense>

      <Suspense fallback={<KPISkeletonLoader />}>
        {kpiData.map(kpi => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </Suspense>
    </div>
  );
}
```

```typescript
// app/dashboard/_components/risk-heatmap.tsx ('use client')
'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function RiskHeatmapChart({ data }) {
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);

  return (
    <div>
      <h2>Risk Heatmap</h2>
      {/* Client-side interactivity: hover, click, filter */}
      <LineChart data={data} onClick={(e) => setSelectedRisk(e?.payload?.riskId)}>
        <XAxis />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="residualScore" />
      </LineChart>
      {selectedRisk && <RiskDetail riskId={selectedRisk} />}
    </div>
  );
}
```

#### Pattern 2: Data Table with Server Fetching + Client Filtering

```typescript
// app/risk/page.tsx (Server Component: fetches all risks)
import RiskTable from './_components/risk-table';
import { getRisks } from './_lib/risk.queries';
import { CreateRiskButton } from './_components/create-risk-button';

export default async function RiskRegisterPage() {
  const risks = await getRisks(); // RLS applied server-side

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>Risk Register</h1>
        <CreateRiskButton /> {/* Client component for form trigger */}
      </div>
      {/* Pass data to client table */}
      <RiskTable initialData={risks} />
    </div>
  );
}
```

```typescript
// app/risk/_components/risk-table.tsx ('use client')
'use client';
import { useState } from 'react';
import DataTable from '@/components/data-table'; // Generic table component

export default function RiskTable({ initialData }) {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = initialData.filter(risk =>
    filterStatus === 'all' ? true : risk.status === filterStatus
  );

  return (
    <div>
      <div className="mb-4">
        <label>Filter by Status:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="mitigated">Mitigated</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <DataTable
        columns={[
          { key: 'id', label: 'Risk ID' },
          { key: 'risk_description', label: 'Description' },
          { key: 'inherent_likelihood', label: 'Likelihood' },
          { key: 'inherent_impact', label: 'Impact' },
          { key: 'status', label: 'Status' },
        ]}
        data={filtered}
      />
    </div>
  );
}
```

#### Pattern 3: Form Submission with Server Actions

```typescript
// app/risk/[id]/_components/risk-form.tsx ('use client')
'use client';
import { updateRisk } from '../_lib/risk.actions';
import { useActionState } from 'react'; // React 19+
import { useRouter } from 'next/navigation';

export default function RiskForm({ risk }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateRisk, null);

  return (
    <form action={formAction}>
      <fieldset disabled={isPending}>
        <input type="hidden" name="id" value={risk.id} />
        
        <label>
          Risk Description:
          <textarea name="risk_description" defaultValue={risk.risk_description} required />
        </label>

        <label>
          Likelihood (1-5):
          <input
            type="number"
            name="inherent_likelihood"
            min="1"
            max="5"
            defaultValue={risk.inherent_likelihood}
          />
        </label>

        <label>
          Impact (1-5):
          <input
            type="number"
            name="inherent_impact"
            min="1"
            max="5"
            defaultValue={risk.inherent_impact}
          />
        </label>

        <button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Update Risk'}
        </button>
      </fieldset>

      {state?.error && <p style={{ color: 'red' }}>{state.error}</p>}
      {state?.success && <p style={{ color: 'green' }}>Risk updated</p>}
    </form>
  );
}
```

```typescript
// app/risk/[id]/_lib/risk.actions.ts (Server Actions)
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const UpdateRiskSchema = z.object({
  id: z.string().uuid(),
  risk_description: z.string().min(10),
  inherent_likelihood: z.coerce.number().int().min(1).max(5),
  inherent_impact: z.coerce.number().int().min(1).max(5),
});

export async function updateRisk(prevState: any, formData: FormData) {
  try {
    const data = Object.fromEntries(formData);
    const parsed = UpdateRiskSchema.parse(data);

    const supabase = createServerClient();
    const { data: updated, error } = await supabase
      .from('risks')
      .update({
        risk_description: parsed.risk_description,
        inherent_likelihood: parsed.inherent_likelihood,
        inherent_impact: parsed.inherent_impact,
      })
      .eq('id', parsed.id)
      .select();

    if (error) throw error;

    revalidatePath(`/risk/${parsed.id}`);
    return { success: true, data: updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' };
  }
}
```

#### Pattern 4: Modal with Server Component Content

```typescript
// app/risk/_components/create-risk-button.tsx ('use client')
'use client';
import { useState } from 'react';
import Modal from '@/components/modal';
import RiskForm from './risk-form'; // Another client component

export function CreateRiskButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Create Risk</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <RiskForm onSuccess={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
```

---

## Data Flow & Authentication

### Login Flow

```
1. User visits /login
   ↓
2. Login form (Client Component) submits email/password
   ↓
3. Supabase Auth validates credentials
   ↓
4. Custom Access Token Hook runs → queries DB, populates JWT claims
   ↓
5. JWT includes: role, institution_id, department_id
   ↓
6. Redirect to callback → middleware.ts extracts JWT
   ↓
7. Middleware stores token in cookies (httpOnly, secure)
   ↓
8. Redirect to /dashboard
   ↓
9. Dashboard page.tsx calls getServerSession()
   ↓
10. Supabase client (server-side) reads cookie → sets Authorization header
    ↓
11. All Supabase queries have RLS applied automatically
    ↓
12. Only data matching RLS policies returned
```

### Request Flow for Protected Route

```
User Action: Click "View Risk Register"
↓
Next.js Router navigates to /risk
↓
middleware.ts runs:
  • Extract auth token from cookies
  • Validate token expiry
  • If expired: refresh token via Supabase
  • Update cookies with new token
  • If no token: redirect to /login
↓
Risk page.tsx (Server Component) renders:
  • Calls getRisks() (server-side function)
  • getRisks() creates Supabase client with cookie context
  • Supabase client reads JWT from cookies → sends with request
  • Supabase database applies RLS policies:
    • WHERE institution_id = jwt_claim('institution_id')
    • WHERE (risk_owner_id = auth.uid()) OR (jwt_claim('role') IN ('admin', 'risk_officer'))
  • Only matching rows returned
↓
RiskTable Client Component receives filtered data
↓
User interacts with table (filter, sort, click row)
↓
formAction triggers updateRisk Server Action
↓
Server Action:
  • Receives FormData from client
  • Validates with Zod schema
  • Creates Supabase client (inherits auth context from request)
  • Executes UPDATE with RLS:
    • UPDATE risks SET ... WHERE id = ? AND (owner = auth.uid() OR role = 'admin')
  • Returns success/error to client
↓
Client receives response, updates UI
```

### Supabase Client Setup (Key Files)

```typescript
// lib/supabase/server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export function createServerClient() {
  const cookieStore = cookies();
  return createServerComponentClient({
    cookies: () => cookieStore,
  });
}

// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function createClientComponent() {
  return createClientComponentClient();
}

// lib/supabase/middleware.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export function createMiddlewareClient(request: Request) {
  const { supabase, response } = createServerComponentClient({
    cookies: () => ({
      getAll() { return parseCookies(request.headers.get('cookie') || ''); },
      setAll(cookiesToSet) { /* ... */ },
    }),
  });
  return { supabase, response };
}

// middleware.ts (at app root or src/)
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  // Refresh session (refreshes JWT if expired)
  const { data: { user } } = await supabase.auth.getUser();

  // If no user and trying to access protected routes, redirect to login
  if (!user && request.nextUrl.pathname.startsWith('/protected')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon).*)'],
};
```

---

## Build Order & Dependency Rationale

### Phase 1: Foundation (Week 1-2)

**Why first:** RLS and auth are the security bedrock. All subsequent modules depend on correct role setup.

1. **Database schema** (core tables: institutions, users, roles, role_assignments)
2. **Supabase RLS policies** (institution isolation, role gates, confidential access)
3. **Custom JWT claims hook** (populate role, institution_id in tokens)
4. **Next.js middleware** (auth gate, token refresh)
5. **Login flow** (form, callback, session persistence)

**Deliverable:** Users can log in, JWT contains custom claims, dashboard route is auth-gated.

### Phase 2: Strategy Foundation (Week 2-3)

**Why second:** Strategy layer (objectives, KPIs) is the anchor. Risks and compliance link to objectives.

1. **Objectives module** (create, view, hierarchical structure)
2. **KPI module** (create, track baselines/targets, period reporting)
3. **KPI readings workflow** (input readings, track status)
4. **Dashboard widgets** (KPI summary, trend charts)

**Deliverable:** Users can define strategy, record KPI performance, see trends on dashboard.

### Phase 3: Risk Management (Week 3-4)

**Why third:** Risks are core to governance. Feed into board agendas and audit follow-up.

1. **Risk register** (create risk, link to objective, score likelihood/impact)
2. **Risk treatments** (plan mitigation, track completion)
3. **Risk heatmap** (visual dashboard of risk posture)
4. **Control instances** (attach controls to risks, track testing)

**Deliverable:** Risk register visible on dashboard, heatmap shows trend.

### Phase 4: Compliance (Week 4-5)

**Why fourth:** Compliance obligations are statutory. Evidence + attestation workflows are independent.

1. **Compliance obligations** (register statutory requirements, due dates)
2. **Evidence upload workflow** (attach documents to Supabase Storage, link to obligations)
3. **Attestation workflow** (compliance officer reviews, approves/flags exceptions)
4. **Compliance posture dashboard** (% compliant, overdue count, exception summary)

**Deliverable:** Compliance dashboard shows obligation status, evidence upload flow works.

### Phase 5: Board Management (Week 5-6)

**Why fifth:** Board module needs stable data (strategy, risk) to populate agendas/packs. Less critical for prototype validation.

1. **Board meetings** (schedule, create agenda)
2. **Resolutions** (record voting results, create action items)
3. **Board actions** (track resolution follow-up, due dates)
4. **Board pack generation** (bundle strategy, risk, compliance documents)

**Deliverable:** Board meeting workflow end-to-end; actions tracked to completion.

### Phase 6: Audit & Incidents (Week 6, Post-Demo)

**Why last:** Audit findings and incident workflows are feature-rich but not required for core prototype validation.

1. **Audit findings** (create finding, link to controls, track root cause)
2. **Remediation tracking** (action plans, due dates, closure)
3. **Incident intake** (whistleblower + formal case workflows, confidentiality controls)
4. **Case investigation** (investigator-only views, confidential documents)

**Deliverable:** Audit dashboard, incident intake workflow, confidential case separation working.

---

## Integration Points & Module Communication

### Data Dependencies

```
User Login
  ↓ (populates JWT claims)
  ├→ RLS policies filter all queries by institution + role
  │
Institution-Scoped Views
  ├→ Dashboard (consumes: KPI readings, risk heatmap, compliance status, board actions)
  │
Strategic Objectives (anchor)
  ├→ KPI readings linked to objectives
  ├→ Risks linked to objectives
  └→ Compliance obligations mapped to objectives (optional)
  │
Risk Register
  ├→ Risks feed into board agendas (CEO discusses risk posture)
  ├→ Risks link to audit findings (investigation scope)
  └→ Risks map to controls (control test results feed back)
  │
Board Meetings
  ├→ Resolutions create actions (tracked in board_actions)
  ├→ Agenda items pull from risk heatmap, KPI summary, compliance exceptions
  └→ Board packs bundle objectives, risks, compliance, audit findings
  │
Compliance Obligations
  ├→ Evidence upload to Supabase Storage (RLS-gated by institution + role)
  ├→ Attestations require compliance officer approval
  └→ Dashboard aggregates obligation status
  │
Audit Findings
  ├→ Findings link to risks (traceability)
  ├→ Remediation plans are actions with due dates
  └→ Closure tracked in audit_log (immutable)
  │
Incidents / Cases
  ├→ Intake form anonymizes reporter (unless reported by ID)
  ├→ Investigation access restricted to investigator + admin
  └→ Closure documented in case_investigations
```

### API/Action Patterns

**Server Actions (Mutations)** are preferred for GRC operations (atomic, validated, audited):

- `risk.actions.ts`: createRisk, updateRisk, deleteRisk, createTreatment
- `compliance.actions.ts`: uploadEvidence, attestateObligation, rejectEvidence
- `board.actions.ts`: createResolution, createAction, closeAction
- `audit.actions.ts`: createFinding, updateRemediationPlan
- `incidents.actions.ts`: createIncident, assignInvestigator, closeCase

**Route Handlers** (minimal, only for external webhooks or non-mutation operations):
- `/api/audit-log` → External systems post audit events (optional, future)
- No /api/users, /api/risks, etc. — use Server Actions instead

### Shared Components (Cross-Module Reuse)

```
components/
├── data-table.tsx              # Used by: risk register, compliance, audit, board
├── risk-badge.tsx             # Used by: dashboard, risk detail, board agenda
├── kpi-card.tsx               # Used by: dashboard, strategy view
├── evidence-upload.tsx        # Used by: compliance obligations, audit findings
├── approval-badge.tsx         # Used by: board resolutions, attestations, actions
├── timeline.tsx               # Used by: board action tracking, case investigation
├── document-viewer.tsx        # Used by: board packs, compliance evidence, audit files
└── modal.tsx                  # Used by: create/edit forms across all modules
```

---

## Caching & Real-Time Strategy

### ISR (Incremental Static Revalidation) for Dashboard

Dashboard widgets are mostly static (update hourly or on-demand):

```typescript
// app/dashboard/page.tsx
export const revalidate = 3600; // 1 hour ISR

export const dynamicParams = false; // Pre-render only

// Revalidate on-demand after mutation
export async function revalidateDashboard() {
  revalidatePath('/dashboard');
}
```

### On-Demand Revalidation After Mutations

After Server Actions complete, revalidate related paths:

```typescript
// app/risk/[id]/_lib/risk.actions.ts
export async function updateRisk(formData: FormData) {
  // ... mutation logic ...
  
  // Revalidate affected paths
  revalidateTag('risks');        // Invalidate all risk queries
  revalidatePath('/risk');       // Invalidate risk list
  revalidatePath('/dashboard');  // Invalidate dashboard
  
  return { success: true };
}
```

### Real-Time Subscriptions (Optional, Future Enhancement)

For live updates (e.g., action closure, board decision), use Supabase Realtime:

```typescript
// Example: Listen for new board actions
const supabase = createClientComponent();
supabase
  .from('board_actions')
  .on('*', (payload) => {
    console.log('Action updated:', payload);
    // Trigger UI refresh
  })
  .subscribe();
```

But for prototype scope, **on-demand revalidation** is sufficient.

---

## Deployment & Performance

### Vercel Frontend + Supabase Backend

- **Frontend:** Deployed on Vercel (automatic preview + prod)
- **Supabase:** Cloud or self-hosted, Southern Africa region (post-prototype)
- **Storage:** Supabase Storage buckets (private, RLS-gated)

### Performance Optimizations

| Concern | Strategy |
|---------|----------|
| **Large dashboards** | Suspense + streaming; load KPI, risk, compliance widgets in parallel |
| **Data table pagination** | Server-side pagination (limit 50 rows); client-side filtering only on pre-fetched data |
| **File uploads** | TUS protocol for resumable uploads (Supabase Storage supports) |
| **Document packs** | Generate as static PDFs on-demand, serve via Storage CDN |
| **Audit logs** | Append-only; archive old rows to separate table; index by institution_id + timestamp |
| **JWT refresh** | Middleware refreshes token automatically; request doesn't block |

---

## Summary: Architecture Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Server Components default** | Minimize client bundle; fetch close to data; security. | Learning curve for team unfamiliar with RSC. |
| **Supabase RLS enforcement** | Policy-layer security is tamper-proof; declarative. | Complex policies hard to debug; test thoroughly. |
| **Feature-module routes** | Colocate UI + logic; isolated concerns; scales to multi-module. | Deeper nesting; scaffold tools help. |
| **Server Actions for mutations** | Type-safe; validation on server; no API routes. | Can't be cached (by design); requires 'use client' form wrapper. |
| **JWT custom claims** | Single-call auth context; no N+1 queries per request. | Claims update only at re-login; use role_assignments TTL to manage stale roles. |
| **Institution isolation via RLS** | Automatic per-query filtering; prevents data leak bugs. | All tables need institution_id column + policy; higher maintenance. |

---

## Next: Phase Roadmap Input

This architecture informs the roadmap build order:

1. **Phase 1 (Foundation):** Auth + RLS + middleware
2. **Phase 2 (Strategy):** Objectives + KPIs + dashboard
3. **Phase 3 (Risk):** Risk register + heatmap
4. **Phase 4 (Compliance):** Obligations + evidence + attestation
5. **Phase 5 (Board):** Meetings + resolutions + actions
6. **Phase 6+ (Audit, Incidents):** Investigation workflows, confidential access

Each phase delivers a working, integrated slice. By phase 5, prototype is demoable to stakeholders.

---

## Sources

- [Enterprise Patterns with the Next.js App Router](https://medium.com/@vasanthancomrads/enterprise-patterns-with-the-next-js-app-router-ff4ca0ef04c4)
- [Feature-Sliced Design: Next.js App Router Guide](https://feature-sliced.design/blog/nextjs-app-router-guide)
- [Next.js 14 App Router Project Structure](https://dev.to/whoffagents/nextjs-14-app-router-project-structure-the-patterns-that-actually-scale-7a6)
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Setting up Server-Side Auth for Next.js with Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js Caching Architecture](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js Route Handlers Best Practices](https://makerkit.dev/blog/tutorials/nextjs-api-best-practices)
- [Supabase RLS Best Practices for Multi-Tenant Apps](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [GRC Data Models and Common Controls](https://www.wolterskluwer.com/en/expert-insights/grc-data-models-common-controls)
