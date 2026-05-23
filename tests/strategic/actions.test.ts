// tests/strategic/actions.test.ts
// Unit tests for lib/strategic/actions.ts Server Actions.
// Tests verify RBAC, Zod validation, Supabase calls, and error handling.
// Mocks Supabase client and revalidatePath — actions are pure async functions.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock next/cache revalidatePath ─────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── Shared mock state ───────────────────────────────────────────────────────
// Controls what the mocked supabase.auth.getUser() returns
let mockUser: { id: string; app_metadata: Record<string, string> } | null = null
let mockDbData: Record<string, unknown> | null = null
let mockDbError: { message: string } | null = null
// Controls what .single() returns for recordKpiReading KPI fetch
let mockKpiData: { owner_id: string; institution_id: string } | null = null
let mockKpiError: { message: string } | null = null

// ─── Mock @supabase/ssr (createServerClient) ─────────────────────────────────
// The mock intercepts createClient() from lib/supabase/server which calls createServerClient
vi.mock('@supabase/ssr', () => {
  const buildSingle = () => ({
    single: vi.fn(() => {
      return { data: mockKpiData, error: mockKpiError }
    }),
  })

  const buildInsert = () => ({
    insert: vi.fn(() => {
      return { data: mockDbData, error: mockDbError }
    }),
    select: vi.fn(() => ({
      single: vi.fn(() => {
        return { data: mockDbData, error: mockDbError }
      }),
    })),
  })

  const buildUpdate = () => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => {
            return { data: mockDbData, error: mockDbError }
          }),
        })),
      })),
    })),
  })

  const fromImpl = (table: string) => {
    if (table === 'kpis') {
      // first call may be the KPI fetch (select), second may be insert
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => buildSingle()),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockDbData, error: mockDbError })),
          })),
        })),
      }
    }
    return {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => {
            return { data: mockDbData, error: mockDbError }
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              return { data: mockDbData, error: mockDbError }
            }),
          })),
        })),
      })),
    }
  }

  return {
    createServerClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(() => ({ data: { user: mockUser }, error: null })),
      },
      from: vi.fn((table: string) => fromImpl(table)),
    })),
  }
})

// ─── Mock next/headers (required by lib/supabase/server.ts) ─────────────────
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

// Import AFTER mocks are set up
import {
  createObjective,
  updateObjective,
  updateObjectiveStatus,
  createKpi,
  updateKpi,
  recordKpiReading,
} from '@/lib/strategic/actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const makeUser = (role: string, id = 'user-uuid-1', institutionId = 'inst-uuid-1') => ({
  id,
  app_metadata: {
    active_role: role,
    institution_id: institutionId,
  },
})

const validObjective = {
  title: 'Improve public service delivery',
  description: 'Digitize 80% of citizen services',
  owner_id: 'owner-uuid-1',
  status: 'active' as const,
  nds2_pillar: 'governance_and_institutions' as const,
  institutional_goal: undefined,
  start_date: '2026-01-01',
  target_date: '2026-12-31',
}

const validKpi = {
  objective_id: 'obj-uuid-1',
  title: 'Service digitization rate',
  description: 'Percentage of services digitized',
  owner_id: 'owner-uuid-1',
  baseline_value: 10,
  target_value: 80,
  unit_of_measure: '%',
  reporting_frequency: 'quarterly' as const,
}

const validKpiReading = {
  reporting_period: '2026-Q1',
  actual_value: 45,
  notes: 'Q1 progress',
}

// ─── createObjective ─────────────────────────────────────────────────────────
describe('createObjective', () => {
  beforeEach(() => {
    mockUser = null
    mockDbData = null
    mockDbError = null
    mockKpiData = null
    mockKpiError = null
  })

  it('returns error for dept-head role (not in allowed roles)', async () => {
    mockUser = makeUser('dept-head')
    mockDbData = { id: 'obj-1' }

    const result = await createObjective(validObjective)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })

  it('returns error for risk-officer role (not in allowed roles)', async () => {
    mockUser = makeUser('risk-officer')

    const result = await createObjective(validObjective)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })

  it('returns error for audit-officer role (not in allowed roles)', async () => {
    mockUser = makeUser('audit-officer')

    const result = await createObjective(validObjective)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })

  it('returns error for board-member role (not in allowed roles)', async () => {
    mockUser = makeUser('board-member')

    const result = await createObjective(validObjective)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })

  it('returns { data: { id } } for admin role on valid insert', async () => {
    mockUser = makeUser('admin')
    mockDbData = { id: 'obj-new-1' }

    const result = await createObjective(validObjective)

    expect(result).toEqual({ data: { id: 'obj-new-1' } })
  })

  it('returns { data: { id } } for ceo role on valid insert', async () => {
    mockUser = makeUser('ceo')
    mockDbData = { id: 'obj-new-2' }

    const result = await createObjective(validObjective)

    expect(result).toEqual({ data: { id: 'obj-new-2' } })
  })

  it('returns { error } when user is not authenticated', async () => {
    mockUser = null

    const result = await createObjective(validObjective)

    expect(result).toEqual({ error: 'Unauthorized.' })
  })

  it('returns Zod error when title is empty', async () => {
    mockUser = makeUser('admin')

    const result = await createObjective({ ...validObjective, title: '' })

    expect(result).toEqual({ error: expect.any(String) })
  })

  it('returns generic error on Supabase DB error (does not expose internal details)', async () => {
    mockUser = makeUser('admin')
    mockDbError = { message: 'column "xyz" does not exist' }

    const result = await createObjective(validObjective)

    expect(result).toEqual({ error: expect.any(String) })
    // Must not leak internal DB error message
    expect((result as { error: string }).error).not.toContain('column')
  })
})

// ─── updateObjective ─────────────────────────────────────────────────────────
describe('updateObjective', () => {
  beforeEach(() => {
    mockUser = null
    mockDbData = null
    mockDbError = null
  })

  it('returns { data: { id } } for ceo role updating an objective', async () => {
    mockUser = makeUser('ceo')
    mockDbData = { id: 'obj-1' }

    const result = await updateObjective('obj-1', validObjective)

    expect(result).toEqual({ data: { id: 'obj-1' } })
  })

  it('returns error for risk-officer role (not in allowed roles)', async () => {
    mockUser = makeUser('risk-officer')

    const result = await updateObjective('obj-1', validObjective)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })
})

// ─── updateObjectiveStatus ───────────────────────────────────────────────────
describe('updateObjectiveStatus', () => {
  beforeEach(() => {
    mockUser = null
    mockDbData = null
    mockDbError = null
  })

  it('returns { data: { id } } for admin role with valid status', async () => {
    mockUser = makeUser('admin')
    mockDbData = { id: 'obj-1' }

    const result = await updateObjectiveStatus('obj-1', 'active')

    expect(result).toEqual({ data: { id: 'obj-1' } })
  })

  it('returns error for invalid status value', async () => {
    mockUser = makeUser('admin')

    // Cast to test invalid input at runtime
    const result = await updateObjectiveStatus('obj-1', 'invalid-status' as 'active')

    expect(result).toEqual({ error: expect.any(String) })
  })

  it('returns error for dept-head role', async () => {
    mockUser = makeUser('dept-head')

    const result = await updateObjectiveStatus('obj-1', 'active')

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })
})

// ─── createKpi ───────────────────────────────────────────────────────────────
describe('createKpi', () => {
  beforeEach(() => {
    mockUser = null
    mockDbData = null
    mockDbError = null
  })

  it('returns { data: { id } } for risk-officer role (allowed to create KPIs)', async () => {
    mockUser = makeUser('risk-officer')
    mockDbData = { id: 'kpi-new-1' }

    const result = await createKpi(validKpi)

    expect(result).toEqual({ data: { id: 'kpi-new-1' } })
  })

  it('returns { data: { id } } for admin role', async () => {
    mockUser = makeUser('admin')
    mockDbData = { id: 'kpi-new-2' }

    const result = await createKpi(validKpi)

    expect(result).toEqual({ data: { id: 'kpi-new-2' } })
  })

  it('returns { data: { id } } for ceo role', async () => {
    mockUser = makeUser('ceo')
    mockDbData = { id: 'kpi-new-3' }

    const result = await createKpi(validKpi)

    expect(result).toEqual({ data: { id: 'kpi-new-3' } })
  })

  it('returns role-denied error for audit-officer', async () => {
    mockUser = makeUser('audit-officer')

    const result = await createKpi(validKpi)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })

  it('returns role-denied error for board-member', async () => {
    mockUser = makeUser('board-member')

    const result = await createKpi(validKpi)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })

  it('returns role-denied error for dept-head', async () => {
    mockUser = makeUser('dept-head')

    const result = await createKpi(validKpi)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })
})

// ─── updateKpi ───────────────────────────────────────────────────────────────
describe('updateKpi', () => {
  beforeEach(() => {
    mockUser = null
    mockDbData = null
    mockDbError = null
  })

  it('returns { data: { id } } for risk-officer role', async () => {
    mockUser = makeUser('risk-officer')
    mockDbData = { id: 'kpi-1' }

    const result = await updateKpi('kpi-1', validKpi)

    expect(result).toEqual({ data: { id: 'kpi-1' } })
  })

  it('returns error for dept-head role', async () => {
    mockUser = makeUser('dept-head')

    const result = await updateKpi('kpi-1', validKpi)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error).toMatch(/permission/i)
  })
})

// ─── recordKpiReading ────────────────────────────────────────────────────────
describe('recordKpiReading', () => {
  const KPI_ID = 'kpi-uuid-1'
  const OWNER_ID = 'owner-uuid-1'
  const INST_ID = 'inst-uuid-1'

  beforeEach(() => {
    mockUser = null
    mockDbData = null
    mockDbError = null
    mockKpiData = null
    mockKpiError = null
  })

  it('returns error when KPI is not found', async () => {
    mockUser = makeUser('risk-officer', OWNER_ID, INST_ID)
    mockKpiData = null
    mockKpiError = { message: 'No rows found' }

    const result = await recordKpiReading(KPI_ID, validKpiReading)

    expect(result).toEqual({ error: 'KPI not found.' })
  })

  it('returns error when user is not the owner and not admin', async () => {
    mockUser = makeUser('risk-officer', 'different-user-id', INST_ID)
    mockKpiData = { owner_id: OWNER_ID, institution_id: INST_ID }
    mockKpiError = null

    const result = await recordKpiReading(KPI_ID, validKpiReading)

    expect(result).toEqual({ error: 'Only the KPI owner or an administrator can record readings.' })
  })

  it('returns { data: { id } } when user is the owner', async () => {
    mockUser = makeUser('risk-officer', OWNER_ID, INST_ID)
    mockKpiData = { owner_id: OWNER_ID, institution_id: INST_ID }
    mockKpiError = null
    mockDbData = { id: 'reading-new-1' }

    const result = await recordKpiReading(KPI_ID, validKpiReading)

    expect(result).toEqual({ data: { id: 'reading-new-1' } })
  })

  it('returns { data: { id } } when user is admin (regardless of owner_id)', async () => {
    mockUser = makeUser('admin', 'admin-user-id', INST_ID)
    mockKpiData = { owner_id: OWNER_ID, institution_id: INST_ID }
    mockKpiError = null
    mockDbData = { id: 'reading-new-2' }

    const result = await recordKpiReading(KPI_ID, validKpiReading)

    expect(result).toEqual({ data: { id: 'reading-new-2' } })
  })

  it('returns Zod error on invalid reading (empty period)', async () => {
    mockUser = makeUser('admin', 'admin-user-id', INST_ID)

    const result = await recordKpiReading(KPI_ID, { ...validKpiReading, reporting_period: '' })

    expect(result).toEqual({ error: expect.any(String) })
  })
})
