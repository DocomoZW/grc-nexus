// lib/schemas/esg.ts
// Phase 12 — Zod schemas for ESG metric definitions and readings.

import { z } from 'zod'
import { ESG_CATEGORIES } from '@/types/esg'

export const esgMetricSchema = z.object({
  framework_id:  z.string().uuid('Invalid framework.').optional().or(z.literal('')).transform(v => v || null),
  metric_code:   z.string().min(1, 'Metric code is required.').max(50),
  name:          z.string().min(2, 'Name must be at least 2 characters.').max(200),
  category:      z.enum(ESG_CATEGORIES as [string, ...string[]], { required_error: 'Category is required.' }),
  unit:          z.string().min(1, 'Unit is required.').max(50),
  target_value:  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().nullable(),
  ),
  description:   z.string().max(1000).optional().or(z.literal('')).transform(v => v || null),
})

export const esgReadingSchema = z.object({
  period_label:  z.string().min(1, 'Period is required.').max(50),
  actual_value:  z.preprocess(
    (v) => (v === '' ? NaN : Number(v)),
    z.number({ invalid_type_error: 'Enter a valid number.' }),
  ),
  notes:         z.string().max(1000).optional().or(z.literal('')).transform(v => v || null),
  evidence_url:  z.string().url('Must be a valid URL.').optional().or(z.literal('')).transform(v => v || null),
})

export type EsgMetricInput  = z.infer<typeof esgMetricSchema>
export type EsgReadingInput = z.infer<typeof esgReadingSchema>
