// app/api/analytics/anomaly-detect/route.ts
// Daily anomaly detection cron handler — triggered by Vercel native cron (GET).
// SECURITY: Authorization: Bearer {CRON_SECRET} guard is FIRST operation before any DB call.
// NOTE: Uses GET (not POST) — Vercel native cron sends GET with Authorization header.
// Existing routes (kri/alert, auto-findings) use POST + x-cron-secret because they use
// Supabase pg_cron; this route uses Vercel cron — different invocation mechanism.

import { sendAnomalyAlerts } from '@/lib/analytics/anomaly'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // CRON_SECRET guard — FIRST operation before any DB call or computation
  const authHeader = request.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await sendAnomalyAlerts()
    return Response.json({
      success: true,
      anomaliesFound: result.sent,
      skipped: result.skipped,
    })
  } catch (err) {
    console.error('[analytics/anomaly-detect] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
