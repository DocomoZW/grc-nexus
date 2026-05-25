// lib/risk/kri-alert.ts
// KRI breach email alert service.
// Called by app/api/kri/alert/route.ts via pg_cron daily POST.
// Queries KRI readings recorded in the last 25 hours with status='breached'
// to provide a 1-hour overlap buffer around a 24-hour cron schedule (D-25).

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * HTML-escape user-supplied strings before embedding in email HTML (XSS prevention).
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const resend = new Resend(process.env.RESEND_API_KEY)

interface KriBreach {
  id:          string
  kri_id:      string
  actual_value: number
  period_start: string
  period_end:   string
  institution_id: string
  kri_definitions: { title: string; unit_of_measure: string; alert_threshold: number; owner_id: string | null }
    | { title: string; unit_of_measure: string; alert_threshold: number; owner_id: string | null }[]
    | null
}

/**
 * Send KRI breach alert emails for all breached readings in the last 25 hours.
 * Recipients: KRI owner + institution admin users.
 */
export async function sendKriBreachAlerts(): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient()

  // 25-hour dedup window to account for cron drift
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()

  const { data: breaches, error } = await admin
    .from('kri_readings')
    .select(
      `
      id,
      kri_id,
      actual_value,
      period_start,
      period_end,
      institution_id,
      kri_definitions ( title, unit_of_measure, alert_threshold, owner_id )
      `
    )
    .eq('status', 'breached')
    .gte('recorded_at', since)

  if (error) {
    console.error('[sendKriBreachAlerts] DB query error:', error)
    return { sent: 0, skipped: 0 }
  }

  let sent    = 0
  let skipped = 0

    for (const breach of ((breaches ?? []) as unknown) as KriBreach[]) {
    const def = Array.isArray(breach.kri_definitions)
      ? breach.kri_definitions[0]
      : breach.kri_definitions

    if (!def) { skipped++; continue }

    const recipients = new Set<string>()

    // Add KRI owner
    if (def.owner_id) {
      const { data: ownerUser } = await admin.auth.admin.getUserById(def.owner_id)
      if (ownerUser?.user?.email) recipients.add(ownerUser.user.email)
    }

    // Add institution admins
    const { data: adminProfiles } = await admin
      .from('user_profiles')
      .select('id')
      .eq('institution_id', breach.institution_id)
      .eq('active_role', 'admin')

    if (adminProfiles) {
      for (const profile of adminProfiles) {
        const { data: adminUser } = await admin.auth.admin.getUserById(
          (profile as { id: string }).id
        )
        if (adminUser?.user?.email) recipients.add(adminUser.user.email)
      }
    }

    if (recipients.size === 0) { skipped++; continue }

    const title     = escapeHtml(def.title)
    const unit      = escapeHtml(def.unit_of_measure)
    const threshold = def.alert_threshold
    const actual    = breach.actual_value

    const html = `
<p>A <strong>Key Risk Indicator (KRI) has breached its alert threshold</strong>.</p>
<table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
  <tr><th align="left">KRI</th><td>${title}</td></tr>
  <tr><th align="left">Actual Value</th><td>${actual} ${unit}</td></tr>
  <tr><th align="left">Alert Threshold</th><td>${threshold} ${unit}</td></tr>
  <tr><th align="left">Period</th><td>${escapeHtml(breach.period_start)} – ${escapeHtml(breach.period_end)}</td></tr>
</table>
<p>Please review this KRI immediately and take corrective action.</p>
`

    try {
      await resend.emails.send({
        from:    'GRC-Nexus Alerts <alerts@mail.grc-nexus.app>',
        to:      Array.from(recipients),
        subject: `[KRI BREACH] ${def.title}`,
        html,
      })
      sent++
    } catch (emailErr) {
      console.error('[sendKriBreachAlerts] Email send error:', emailErr)
      skipped++
    }
  }

  return { sent, skipped }
}
