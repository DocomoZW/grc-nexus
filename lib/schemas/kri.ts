// lib/schemas/kri.ts
// Zod v3 validation schemas for KRI definition and reading forms.
import { z } from 'zod'

// ─── Numeric coercion helper ─────────────────────────────────────────────────
// Mirrors numericField() in lib/schemas/strategic.ts: rejects empty strings.
const numericField = (errorMessage: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number({ invalid_type_error: errorMessage }),
  )

// ─── kriDefinitionSchema ─────────────────────────────────────────────────────
export const kriDefinitionSchema = z.object({
  title:               z.string().min(1, 'Title is required.'),
  description:         z.string().optional(),
  risk_id:             z.string().uuid().optional().nullable(),
  unit_of_measure:     z.string().min(1, 'Unit of measure is required.'),
  target_value:        numericField('Target value must be a number.'),
  alert_threshold:     numericField('Alert threshold must be a number.'),
  direction:           z.enum(['lower_is_worse', 'higher_is_worse'], {
                         required_error: 'Direction is required.',
                       }),
  owner_id:            z.string().uuid('Owner must be a valid user.'),
  reporting_frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual'], {
                         required_error: 'Reporting frequency is required.',
                       }),
})

export type KriDefinitionInput = z.infer<typeof kriDefinitionSchema>

// ─── kriReadingSchema ────────────────────────────────────────────────────────
export const kriReadingSchema = z.object({
  period_start: z.string().min(1, 'Period start is required.'),
  period_end:   z.string().min(1, 'Period end is required.'),
  actual_value: numericField('Actual value must be a number.'),
  notes:        z.string().optional(),
})

export type KriReadingInput = z.infer<typeof kriReadingSchema>
