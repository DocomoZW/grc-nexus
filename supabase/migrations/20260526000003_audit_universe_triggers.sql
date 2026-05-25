-- Migration: 20260526000003_audit_universe_triggers.sql
-- Phase 10 Audit Universe: attach immutable audit triggers.

select audit.attach_audit_trigger('audit_plans');
select audit.attach_audit_trigger('audit_engagements');
select audit.attach_audit_trigger('audit_test_procedures');
select audit.attach_audit_trigger('audit_workpapers');
