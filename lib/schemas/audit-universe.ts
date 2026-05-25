// lib/schemas/audit-universe.ts
// Zod schemas for Audit Universe forms (Phase 10).
import { z } from 'zod'

// ─── Audit Plan ───────────────────────────────────────────────────────────────

export const auditPlanSchema = z.object({
  title:       z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  plan_year:   z.coerce.number().int().min(2020).max(2100, 'Year must be between 2020 and 2100.'),
})

export type AuditPlanInput = z.infer<typeof auditPlanSchema>

export const auditPlanStatusSchema = z.object({
  status: z.enum(['draft', 'approved', 'in_progress', 'completed', 'cancelled']),
})

export type AuditPlanStatusInput = z.infer<typeof auditPlanStatusSchema>

// ─── Audit Engagement ─────────────────────────────────────────────────────────

export const auditEngagementSchema = z.object({
  title:           z.string().min(1, 'Title is required.').max(200),
  description:     z.string().max(2000).optional().or(z.literal('')),
  auditee_dept:    z.string().max(100).optional().or(z.literal('')),
  lead_auditor_id: z.string().uuid('Select a lead auditor.').nullable().optional(),
  planned_start:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid start date required.'),
  planned_end:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date required.'),
}).refine(
  (d) => !d.planned_start || !d.planned_end || d.planned_end >= d.planned_start,
  { message: 'End date must be on or after start date.', path: ['planned_end'] },
)

export type AuditEngagementInput = z.infer<typeof auditEngagementSchema>

export const auditEngagementStatusSchema = z.object({
  status:       z.enum(['planned', 'fieldwork', 'reporting', 'completed', 'cancelled']),
  opinion:      z.string().max(4000).optional().or(z.literal('')),
  actual_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  actual_end:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export type AuditEngagementStatusInput = z.infer<typeof auditEngagementStatusSchema>

// ─── Test Procedure ───────────────────────────────────────────────────────────

export const auditTestProcedureSchema = z.object({
  step_number:     z.coerce.number().int().min(1),
  objective:       z.string().min(1, 'Objective is required.').max(500),
  procedure_text:  z.string().min(1, 'Procedure is required.').max(4000),
  notes:           z.string().max(2000).optional().or(z.literal('')),
})

export type AuditTestProcedureInput = z.infer<typeof auditTestProcedureSchema>

export const auditTestProcedureResultSchema = z.object({
  result: z.enum(['not_started', 'pass', 'fail', 'exception', 'not_applicable']),
  notes:  z.string().max(2000).optional().or(z.literal('')),
})

export type AuditTestProcedureResultInput = z.infer<typeof auditTestProcedureResultSchema>

// ─── Workpaper ────────────────────────────────────────────────────────────────

export const auditWorkpaperSchema = z.object({
  title:            z.string().min(1, 'Title is required.').max(200),
  description:      z.string().max(2000).optional().or(z.literal('')),
  reference_number: z.string().max(50).optional().or(z.literal('')),
})

export type AuditWorkpaperInput = z.infer<typeof auditWorkpaperSchema>
