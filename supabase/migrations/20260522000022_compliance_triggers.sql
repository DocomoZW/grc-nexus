-- Migration: 20260522000022_compliance_triggers.sql
-- Phase 4 Compliance Management: audit trigger attachment for all three compliance tables.
-- D-34: audit triggers via audit.attach_audit_trigger() on all three tables.
-- This mirrors the pattern from 20260522000019_risk_triggers.sql.

select audit.attach_audit_trigger('compliance_obligations');
select audit.attach_audit_trigger('obligation_evidence');
select audit.attach_audit_trigger('obligation_attestations');
