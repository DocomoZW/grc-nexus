import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => ({
          order: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/incidents/actions', () => ({
  createIncidentCase: vi.fn(async (body) => {
    if (body.title === 'Invalid') {
      return { error: 'Invalid title.' }
    }
    return { data: { id: 'case-123' } }
  }),
}))

vi.mock('@/lib/incidents/escalation', () => ({
  sendIncidentEscalationEmails: vi.fn(async () => ({ sent: 0, skipped: 0 })),
}))

import { POST as POSTEscalate } from '@/app/api/incidents/escalate/route'
import { POST as POSTIntake } from '@/app/api/incidents/intake/route'

describe('Incident API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'super-secret-key'
  })

  describe('POST /api/incidents/escalate', () => {
    it('returns 401 unauthorized when x-cron-secret header is missing or incorrect', async () => {
      const requestMissing = new Request('http://localhost/api/incidents/escalate', {
        method: 'POST',
        headers: {},
      })
      const responseMissing = await POSTEscalate(requestMissing)
      expect(responseMissing.status).toBe(401)

      const requestIncorrect = new Request('http://localhost/api/incidents/escalate', {
        method: 'POST',
        headers: { 'x-cron-secret': 'wrong-key' },
      })
      const responseIncorrect = await POSTEscalate(requestIncorrect)
      expect(responseIncorrect.status).toBe(401)
    })

    it('returns 200 on success when x-cron-secret header is correct', async () => {
      const request = new Request('http://localhost/api/incidents/escalate', {
        method: 'POST',
        headers: { 'x-cron-secret': 'super-secret-key' },
      })
      const response = await POSTEscalate(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.incidentsFound).toBe(0)
    })
  })

  describe('POST /api/incidents/intake', () => {
    it('accepts valid payloads and delegates to createIncidentCase', async () => {
      const request = new Request('http://localhost/api/incidents/intake', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title Here',
          description: 'A sufficiently long description of the issue.',
          category: 'fraud',
          is_anonymous: true,
          institution_id: 'inst-1',
        }),
      })
      const response = await POSTIntake(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('case-123')
    })

    it('rejects malformed payloads and accepts authenticated-context submissions without explicit institution_id', async () => {
      const malformed = new Request('http://localhost/api/incidents/intake', {
        method: 'POST',
        body: JSON.stringify(null),
      })
      const malformedResponse = await POSTIntake(malformed)
      expect(malformedResponse.status).toBe(400)

      const request = new Request('http://localhost/api/incidents/intake', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title Here',
          description: 'A sufficiently long description of the issue.',
          category: 'fraud',
          is_anonymous: true,
        }),
      })
      const response = await POSTIntake(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })
})
