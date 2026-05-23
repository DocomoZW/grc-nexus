import { createClient } from '@/lib/supabase/server'
import { getIncidentCasesForEscalation } from '@/lib/incidents/queries'
import { sendIncidentEscalationEmails } from '@/lib/incidents/escalation'

export async function POST(request: Request) {
  // CRON_SECRET guard — FIRST operation before any DB query (T-07-05)
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = await createClient()
    const { data: incidents, error } = await getIncidentCasesForEscalation(supabase)

    if (error) {
      console.error('[escalate] DB query error:', error)
      return Response.json({ error: 'Failed to query incidents' }, { status: 500 })
    }

    const result = await sendIncidentEscalationEmails(incidents)

    return Response.json({
      success: true,
      incidentsFound: incidents.length,
      emailsSent: result.sent,
      emailsSkipped: result.skipped,
    })
  } catch (err) {
    console.error('[escalate] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
