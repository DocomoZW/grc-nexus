import { describe, it, expect } from 'vitest'
import { normalizeReportingFilters, reportingFilterSchema } from '@/lib/reporting/filters'

describe('reporting filters schema', () => {
  it('rejects invalid date ranges', () => {
    const result = reportingFilterSchema.safeParse({
      from: '2026-05-31',
      to: '2026-05-01',
    })

    expect(result.success).toBe(false)
  })

  it('rejects unknown module values', () => {
    const result = reportingFilterSchema.safeParse({
      module: 'finance',
    })

    expect(result.success).toBe(false)
  })

  it('normalizes defaults when params are omitted', () => {
    const result = normalizeReportingFilters({})

    expect(result.module).toBe('all')
    expect(result.department).toBeNull()
    expect(result.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.from <= result.to).toBe(true)
  })
})
