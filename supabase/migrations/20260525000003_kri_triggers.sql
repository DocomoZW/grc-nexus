-- Migration: 20260525000003_kri_triggers.sql
-- Phase 9 KRI audit trigger attachment.

select audit.attach_audit_trigger('kri_definitions');
select audit.attach_audit_trigger('kri_readings');
