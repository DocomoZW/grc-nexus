// app/api/kri/alert/route.ts
// POST endpoint callable by Supabase pg_cron or external scheduler.
// Protected by CRON_SECRET header — check is FIRST operation before any DB call.
//
// pg_cron setup (run once in Supabase SQL editor):
//   select cron.schedule(
//     'kri-breach-alerts-daily',
//     '0 7 * * *',
//     $$ select net.http_post(
//       url := 'https://your-app.vercel.app/api/kri/alert',
//       headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
//       body := '{}'::jsonb
//     ) $$
//   );

import { sendKriBreachAlerts } from '@/lib/risk/kri-alert'

export async function POST(request: Request) {
  // CRON_SECRET guard — FIRST operation before any DB query
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await sendKriBreachAlerts()

    return Response.json({
      success:      true,
      emailsSent:   result.sent,
      emailsSkipped: result.skipped,
    })
  } catch (err) {
    console.error('[kri/alert] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
