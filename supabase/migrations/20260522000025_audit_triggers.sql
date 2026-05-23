-- Migration: 20260522000025_audit_triggers.sql
-- Attach immutable audit triggers for phase 6 audit tables.

select audit.attach_audit_trigger('audit_findings');
select audit.attach_audit_trigger('audit_finding_evidence');
