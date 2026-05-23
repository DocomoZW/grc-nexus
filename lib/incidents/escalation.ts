import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import type { IncidentEscalationTarget } from '@/lib/incidents/queries'

/**
 * Escapes HTML characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Calculates the incident escalation threshold bucket.
 * - 'overdue': SLA due date has passed.
 * - 'approaching_breach': SLA due date is within 24 hours.
 * - null: Not in breach/warning window.
 */
export function getIncidentEscalationThreshold(slaDueDateStr: string | null): 'approaching_breach' | 'overdue' | null {
  if (!slaDueDateStr) return null

  const slaDueDate = new Date(slaDueDateStr)
  const now = new Date()
  const diffMs = slaDueDate.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 0) {
    return 'overdue'
  } else if (diffHours <= 24) {
    return 'approaching_breach'
  }

  return null
}

/**
 * Dispatch incident SLA escalation alerts.
 * Recipients: assigned investigator + compliance-officer + admin
 */
export async function sendIncidentEscalationEmails(
  incidents: IncidentEscalationTarget[]
): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient()
  let sent = 0
  let skipped = 0

  for (const incident of incidents) {
    const threshold = getIncidentEscalationThreshold(incident.sla_due_date)
    if (!threshold) {
      skipped++
      continue
    }

    const recipients = new Set<string>()

    // 1. Resolve investigator email if assigned
    if (incident.assigned_investigator_id) {
      const { data: investigatorUser } = await admin.auth.admin.getUserById(incident.assigned_investigator_id)
      if (investigatorUser?.user?.email) {
        recipients.add(investigatorUser.user.email)
      }
    }

    // 2. Resolve compliance-officer and admin emails for the institution
    const { data: oversightProfiles } = await admin
      .from('user_profiles')
      .select('id')
      .eq('institution_id', incident.institution_id)
      .or('active_role.eq.admin,active_role.eq.compliance-officer')

    if (oversightProfiles) {
      for (const profile of oversightProfiles) {
        const { data: oversightUser } = await admin.auth.admin.getUserById(
          (profile as { id: string }).id
        )
        if (oversightUser?.user?.email) {
          recipients.add(oversightUser.user.email)
        }
      }
    }

    if (recipients.size === 0) {
      skipped++
      continue
    }

    const subjectMap: Record<typeof threshold, string> = {
      approaching_breach: `GRC-Nexus Alert: SLA Breach Impending (24h) — ${incident.title}`,
      overdue: `GRC-Nexus URGENT: SLA BREACH OVERDUE — ${incident.title}`,
    }

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@grc-nexus.gov.zw',
        to: Array.from(recipients),
        subject: subjectMap[threshold],
        html: `
          <p>This is an automated incident alert from GRC-Nexus.</p>
          <p><strong>Incident Case:</strong> ${escapeHtml(incident.title)}</p>
          <p><strong>Category:</strong> ${escapeHtml(incident.category.toUpperCase())}</p>
          <p><strong>Status:</strong> ${escapeHtml(incident.status.replace(/_/g, ' '))}</p>
          <p><strong>SLA Due Date:</strong> ${escapeHtml(incident.sla_due_date ?? 'N/A')}</p>
          <p><strong>SLA Status:</strong> ${escapeHtml(threshold.replace(/_/g, ' '))}</p>
          <p>Please log in to GRC-Nexus to triage, investigate, or resolve this case.</p>
        `,
      })
      sent++
    } catch (emailErr) {
      console.error('[sendIncidentEscalationEmails] Email send error:', emailErr)
      skipped++
    }
  }

  return { sent, skipped }
}
