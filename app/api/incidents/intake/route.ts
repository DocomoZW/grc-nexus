import { createIncidentCase } from '@/lib/incidents/actions'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const payload = { ...(body as Record<string, unknown>) }
    if (payload.is_anonymous === true) {
      // Defense-in-depth: anonymous mode must never pass identity fields downstream.
      payload.reporter_name = null
      payload.reporter_contact = null
      payload.reported_by_user_id = null
    }

    const result = await createIncidentCase(payload as Parameters<typeof createIncidentCase>[0])

    if ('error' in result) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    return Response.json({
      success: true,
      data: {
        id: result.data.id,
        case_reference: result.data.case_reference ?? result.data.id,
      },
    })
  } catch (err) {
    console.error('[intake] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
