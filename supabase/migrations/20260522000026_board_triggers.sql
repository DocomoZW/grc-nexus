-- Migration: 20260522000026_board_triggers.sql
-- Phase 5 Board Management: attach immutable audit triggers.

select audit.attach_audit_trigger('board_meetings');
select audit.attach_audit_trigger('board_meeting_documents');
select audit.attach_audit_trigger('board_resolutions');
select audit.attach_audit_trigger('board_action_items');
