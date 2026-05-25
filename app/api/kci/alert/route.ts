// app/api/kci/alert/route.ts
// POST endpoint callable by Supabase pg_cron or external scheduler.
// Protected by CRON_SECRET header — check is FIRST operation before any DB call.
//
// pg_cron setup (run once in Supabase SQL editor):
//   select cron.schedule(
//     'kci-breach-alerts-daily',
//     '0 7 * * *',
//     $$ select net.http_post(
//       url := 'https://your-app.vercel.app/api/kci/alert',
//       headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
//       body := '{}'::jsonb
//     ) $$
//   );

import { sendKciBreachAlerts } from '@/lib/audit/kci-alert'

export async function POST(request: Request) {
  // CRON_SECRET guard — FIRST operation before any DB query
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await sendKciBreachAlerts()

    return Response.json({
      success:       true,
      emailsSent:    result.sent,
      emailsSkipped: result.skipped,
    })
  } catch (err) {
    console.error('[kci/alert] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
