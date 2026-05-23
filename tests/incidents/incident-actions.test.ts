import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

let mockUser: { id: string; email: string; app_metadata: Record<string, string> } | null = null
let lastInsertPayloads: Record<string, any> = {}
let lastUpdatePayloads: Record<string, any> = {}

const eqMock = vi.fn()
const singleMock = vi.fn(() => ({
  data: {
    id: 'case-123',
    institution_id: 'inst-1',
    status: 'new',
    severity: 'low',
    assigned_investigator_id: null,
  },
  error: null,
}))

const chain = {
  eq: eqMock,
  single: singleMock,
  select: vi.fn(() => ({
    single: vi.fn(() => ({ data: { id: 'case-123' }, error: null })),
  })),
}
eqMock.mockReturnValue(chain)

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
  },
  from: vi.fn((tableName) => ({
    insert: vi.fn((payload) => {
      lastInsertPayloads[tableName] = payload
      return {
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'case-123' }, error: null })),
        })),
      }
    }),
    update: vi.fn((payload) => {
      lastUpdatePayloads[tableName] = payload
      return chain
    }),
    select: vi.fn(() => chain),
  })),
}

// Mock `@/lib/supabase/server` directly
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

// Mock `@/lib/supabase/admin` directly
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}))

import {
  createIncidentCase,
  assignIncidentInvestigator,
  updateIncidentStatus,
  closeIncidentCase,
} from '@/lib/incidents/actions'

describe('Incident Server Actions', () => {
  beforeEach(() => {
    mockUser = null
    lastInsertPayloads = {}
    lastUpdatePayloads = {}
    vi.clearAllMocks()
  })

  describe('Test 1: Anonymous vs Named Intake', () => {
    it('strips all reporter identity fields in anonymous intake', async () => {
      mockUser = {
        id: 'u-1',
        email: 'user@example.com',
        app_metadata: { active_role: 'dept-head', institution_id: 'inst-1' },
      }

      const result = await createIncidentCase({
        title: 'Confidential Fraud in Department',
        description: 'Large scale fraud detected in procurement department.',
        category: 'fraud',
        is_anonymous: true,
        reporter_name: 'John Doe',
        reporter_contact: 'john@example.com',
        institution_id: 'inst-1',
      })

      expect('data' in result).toBe(true)
      expect(lastInsertPayloads.incident_cases).toBeDefined()
      expect(lastInsertPayloads.incident_cases.is_anonymous).toBe(true)
      expect(lastInsertPayloads.incident_cases.reported_by_user_id).toBeNull()
      expect(lastInsertPayloads.incident_cases.reporter_name).toBeNull()
      expect(lastInsertPayloads.incident_cases.reporter_contact).toBeNull()
    })

    it('retains reporter identity fields in named intake', async () => {
      mockUser = {
        id: 'u-1',
        email: 'user@example.com',
        app_metadata: { active_role: 'dept-head', institution_id: 'inst-1' },
      }

      const result = await createIncidentCase({
        title: 'Confidential Fraud in Department',
        description: 'Large scale fraud detected in procurement department.',
        category: 'fraud',
        is_anonymous: false,
        reporter_name: 'John Doe',
        reporter_contact: 'john@example.com',
        institution_id: 'inst-1',
      })

      expect('data' in result).toBe(true)
      expect(lastInsertPayloads.incident_cases).toBeDefined()
      expect(lastInsertPayloads.incident_cases.is_anonymous).toBe(false)
      expect(lastInsertPayloads.incident_cases.reported_by_user_id).toBe('u-1')
      expect(lastInsertPayloads.incident_cases.reporter_name).toBe('John Doe')
      expect(lastInsertPayloads.incident_cases.reporter_contact).toBe('john@example.com')
    })
  })

  describe('Test 2: Unauthorized Triage Assignment', () => {
    it('blocks unauthorized roles from triaging or reassigning', async () => {
      mockUser = {
        id: 'u-2',
        email: 'user2@example.com',
        app_metadata: { active_role: 'dept-head', institution_id: 'inst-1' },
      }

      const result = await assignIncidentInvestigator('00000000-0000-0000-0000-000000000001', {
        assigned_investigator_id: '00000000-0000-0000-0000-000000000002',
        severity: 'high',
        visibility: 'investigator_admin_only',
        notes: 'Triaged to specialized unit.',
      })

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('permission')
      }
    })

    it('allows compliance officers or admins to triage', async () => {
      mockUser = {
        id: 'u-3',
        email: 'investigator@example.com',
        app_metadata: { active_role: 'compliance-officer', institution_id: 'inst-1' },
      }

      const result = await assignIncidentInvestigator('00000000-0000-0000-0000-000000000001', {
        assigned_investigator_id: '00000000-0000-0000-0000-000000000002',
        severity: 'high',
        visibility: 'investigator_admin_only',
        notes: 'Triaged to specialized unit.',
      })

      expect('data' in result).toBe(true)
      expect(lastUpdatePayloads.incident_cases.assigned_investigator_id).toBe('00000000-0000-0000-0000-000000000002')
      expect(lastUpdatePayloads.incident_cases.severity).toBe('high')
      expect(lastUpdatePayloads.incident_cases.status).toBe('assigned')
    })
  })

  describe('Test 3: Case Closure Validation', () => {
    it('fails to close a case if resolution summary is empty or too short', async () => {
      mockUser = {
        id: 'u-3',
        email: 'investigator@example.com',
        app_metadata: { active_role: 'compliance-officer', institution_id: 'inst-1' },
      }

      const result = await closeIncidentCase('00000000-0000-0000-0000-000000000001', {
        resolution_summary: 'short',
      })

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('Resolution summary must be at least 10 characters')
      }
    })

    it('successfully closes a case with non-empty resolution summary', async () => {
      mockUser = {
        id: 'u-3',
        email: 'investigator@example.com',
        app_metadata: { active_role: 'compliance-officer', institution_id: 'inst-1' },
      }

      singleMock.mockReturnValueOnce({
        data: {
          id: 'case-123',
          institution_id: 'inst-1',
          status: 'escalated',
          severity: 'high',
          assigned_investigator_id: 'u-3',
        },
        error: null,
      })

      const result = await closeIncidentCase('00000000-0000-0000-0000-000000000001', {
        resolution_summary: 'The case has been completely resolved. Corrective measures applied.',
      })

      expect('data' in result).toBe(true)
      expect(lastUpdatePayloads.incident_cases.status).toBe('closed')
      expect(lastUpdatePayloads.incident_cases.resolution_summary).toContain('completely resolved')
    })
  })
})
