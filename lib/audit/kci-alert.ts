// lib/audit/kci-alert.ts
// KCI breach email alert service.
// Called by app/api/kci/alert/route.ts via pg_cron daily POST.
// Queries KCI readings recorded in the last 25 hours with status='breached'.

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const resend = new Resend(process.env.RESEND_API_KEY)

interface KciBreach {
  id:            string
  kci_id:        string
  actual_value:  number
  period_start:  string
  period_end:    string
  institution_id: string
  kci_definitions: { title: string; unit_of_measure: string; alert_threshold: number; owner_id: string | null }
    | { title: string; unit_of_measure: string; alert_threshold: number; owner_id: string | null }[]
    | null
}

/**
 * Send KCI breach alert emails for all breached readings in the last 25 hours.
 * Recipients: KCI owner + institution admin users.
 */
export async function sendKciBreachAlerts(): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient()

  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()

  const { data: breaches, error } = await admin
    .from('kci_readings')
    .select(
      `
      id,
      kci_id,
      actual_value,
      period_start,
      period_end,
      institution_id,
      kci_definitions ( title, unit_of_measure, alert_threshold, owner_id )
      `
    )
    .eq('status', 'breached')
    .gte('recorded_at', since)

  if (error) {
    console.error('[sendKciBreachAlerts] DB query error:', error)
    return { sent: 0, skipped: 0 }
  }

  let sent    = 0
  let skipped = 0

    for (const breach of ((breaches ?? []) as unknown) as KciBreach[]) {
    const def = Array.isArray(breach.kci_definitions)
      ? breach.kci_definitions[0]
      : breach.kci_definitions

    if (!def) { skipped++; continue }

    const recipients = new Set<string>()

    if (def.owner_id) {
      const { data: ownerUser } = await admin.auth.admin.getUserById(def.owner_id)
      if (ownerUser?.user?.email) recipients.add(ownerUser.user.email)
    }

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
<p>A <strong>Key Control Indicator (KCI) has breached its alert threshold</strong>.</p>
<table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
  <tr><th align="left">KCI</th><td>${title}</td></tr>
  <tr><th align="left">Actual Value</th><td>${actual} ${unit}</td></tr>
  <tr><th align="left">Alert Threshold</th><td>${threshold} ${unit}</td></tr>
  <tr><th align="left">Period</th><td>${escapeHtml(breach.period_start)} – ${escapeHtml(breach.period_end)}</td></tr>
</table>
<p>Please review this KCI and verify that related controls remain effective.</p>
`

    try {
      await resend.emails.send({
        from:    'GRC-Nexus Alerts <alerts@mail.grc-nexus.app>',
        to:      Array.from(recipients),
        subject: `[KCI BREACH] ${def.title}`,
        html,
      })
      sent++
    } catch (emailErr) {
      console.error('[sendKciBreachAlerts] Email send error:', emailErr)
      skipped++
    }
  }

  return { sent, skipped }
}
