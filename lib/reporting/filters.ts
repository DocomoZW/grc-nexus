import { z } from 'zod'
import type { ReportingFilters, ReportingModule } from './types'

const REPORTING_MODULES = [
  'all',
  'strategic',
  'risk',
  'compliance',
  'board',
  'incidents',
  'audit',
] as const

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const reportingFilterSchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    department: z.string().trim().min(1).optional(),
    module: z.enum(REPORTING_MODULES).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.from && input.to && input.from > input.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: '`from` must be before or equal to `to`',
      })
    }
  })

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function normalizeReportingFilters(input: unknown): ReportingFilters {
  const parsed = reportingFilterSchema.parse(input ?? {})

  const today = new Date()
  const defaultTo = toIsoDate(today)
  const defaultFromDate = new Date(today)
  defaultFromDate.setDate(defaultFromDate.getDate() - 30)
  const defaultFrom = toIsoDate(defaultFromDate)

  return {
    from: parsed.from ?? defaultFrom,
    to: parsed.to ?? defaultTo,
    department: parsed.department ?? null,
    module: (parsed.module ?? 'all') as ReportingModule,
  }
}
