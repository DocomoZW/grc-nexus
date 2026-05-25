// lib/schemas/kci.ts
// Zod v3 validation schemas for KCI definition and reading forms.
import { z } from 'zod'

// ─── Numeric coercion helper ─────────────────────────────────────────────────
const numericField = (errorMessage: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number({ invalid_type_error: errorMessage }),
  )

// ─── kciDefinitionSchema ─────────────────────────────────────────────────────
export const kciDefinitionSchema = z.object({
  title:               z.string().min(1, 'Title is required.'),
  description:         z.string().optional(),
  treatment_id:        z.string().uuid().optional().nullable(),
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

export type KciDefinitionInput = z.infer<typeof kciDefinitionSchema>

// ─── kciReadingSchema ────────────────────────────────────────────────────────
export const kciReadingSchema = z.object({
  period_start: z.string().min(1, 'Period start is required.'),
  period_end:   z.string().min(1, 'Period end is required.'),
  actual_value: numericField('Actual value must be a number.'),
  notes:        z.string().optional(),
})

export type KciReadingInput = z.infer<typeof kciReadingSchema>
