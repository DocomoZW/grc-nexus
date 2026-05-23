-- Migration: 20260522000023_board_role_extension.sql
-- Phase 5 Board Management: Extend app_role enum (D-01, D-02)
-- Adds board-secretary (new for Phase 5) and compliance-officer (technical debt fix from Phase 4)
-- Must run BEFORE 00024 board_schema so that RLS policies can reference the new roles.
-- Uses IF NOT EXISTS to be idempotent.

alter type public.app_role add value if not exists 'board-secretary';
alter type public.app_role add value if not exists 'compliance-officer';

-- After this migration, the enum order will include the new values at the end.
-- Verify with: SELECT unnest(enum_range(NULL::public.app_role));
