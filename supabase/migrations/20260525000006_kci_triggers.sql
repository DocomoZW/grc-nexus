-- Migration: 20260525000006_kci_triggers.sql
-- Phase 9 KCI audit trigger attachment.

select audit.attach_audit_trigger('kci_definitions');
select audit.attach_audit_trigger('kci_readings');
