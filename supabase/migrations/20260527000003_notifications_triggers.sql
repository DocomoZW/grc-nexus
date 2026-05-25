-- Phase 11: Notifications audit trigger
-- Migration: 20260527000003_notifications_triggers.sql

select audit.attach_audit_trigger('notifications');
