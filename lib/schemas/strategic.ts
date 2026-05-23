// lib/schemas/strategic.ts
// Zod v3 validation schemas for all Strategic Planning forms.
// CONSTRAINT: Zod v3.x ONLY — no v4 APIs. z.coerce.number() is v3-compatible (D-30).
import { z } from 'zod'

// ─── NDS2 Pillar Enum ────────────────────────────────────────────────────────
// 8 pillars from Zimbabwe NDS2 2026–2030 (locked in D-01)
const NDS2_PILLARS = [
  'economic_transformation',
  'social_development',
  'infrastructure_development',
  'environmental_sustainability',
  'governance_and_institutions',
  'innovation_and_technology',
  'regional_and_international_integration',
  'rural_and_urban_development',
] as const

// ─── objectiveSchema ─────────────────────────────────────────────────────────
// .refine() enforces: at least one of nds2_pillar OR institutional_goal must be set (D-02)
// path: ['nds2_pillar'] so FormMessage renders under that field in the form UI
export const objectiveSchema = z
  .object({
    title:              z.string().min(1, 'Title is required.'),
    description:        z.string().optional(),
    owner_id:           z.string().uuid('Owner must be a valid user.'),
    start_date:         z.string().optional(),
    target_date:        z.string().optional(),
    status:             z.enum(['draft', 'active', 'at_risk', 'completed', 'cancelled'], {
                          invalid_type_error: 'Invalid status.',
                          required_error:     'Status is required.',
                        }),
    nds2_pillar:        z.enum(NDS2_PILLARS).optional().nullable(),
    institutional_goal: z.string().optional(),
  })
  .refine(
    (data) =>
      !!data.nds2_pillar ||
      (!!data.institutional_goal && data.institutional_goal.trim().length > 0),
    {
      message: 'At least one of NDS2 Pillar or Institutional Goal is required.',
      path: ['nds2_pillar'],
    },
  )

// ─── Numeric coercion helper ─────────────────────────────────────────────────
// z.coerce.number() in Zod v3 coerces empty string '' to 0 (Number('') === 0).
// This helper uses z.preprocess to reject empty strings before coercion,
// matching the plan requirement that empty form inputs must fail validation.
const numericField = (errorMessage: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number({ invalid_type_error: errorMessage }),
  )

// ─── kpiSchema ───────────────────────────────────────────────────────────────
// numericField() handles HTML form string-to-number coercion AND rejects empty strings (D-30)
export const kpiSchema = z.object({
  objective_id:        z.string().uuid('Objective must be selected.'),
  title:               z.string().min(1, 'Title is required.'),
  description:         z.string().optional(),
  owner_id:            z.string().uuid('Owner must be a valid user.'),
  baseline_value:      numericField('Baseline must be a number.'),
  target_value:        numericField('Target must be a number.'),
  unit_of_measure:     z.string().min(1, 'Unit of measure is required.'),
  reporting_frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual'], {
                         invalid_type_error: 'Invalid reporting frequency.',
                         required_error:     'Reporting frequency is required.',
                       }),
})

// ─── kpiReadingSchema ────────────────────────────────────────────────────────
// reporting_period uses z.string().min(1) — period label format is a UX concern handled
// by helper text in the form UI, not enforced at schema level (D-12 implementation decision)
// actual_value uses numericField() to reject empty strings and coerce valid numbers (D-30)
export const kpiReadingSchema = z.object({
  reporting_period: z.string().min(1, 'Reporting period is required.'),
  actual_value:     numericField('Actual value must be a number.'),
  notes:            z.string().optional(),
})

// ─── Inferred Types ──────────────────────────────────────────────────────────
export type ObjectiveInput    = z.infer<typeof objectiveSchema>
export type KpiInput          = z.infer<typeof kpiSchema>
export type KpiReadingInput   = z.infer<typeof kpiReadingSchema>
