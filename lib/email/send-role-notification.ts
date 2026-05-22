// lib/email/send-role-notification.ts
// Resend integration for role assignment emails.
// SERVER-SIDE ONLY — never import in client components.
// Gracefully degrades when RESEND_API_KEY is not set (dev environment).
import { Resend } from 'resend'

export async function sendRoleAssignmentEmail(params: {
  to: string
  name: string
  role: string
  institutionName: string
}) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_xxxx' || process.env.RESEND_API_KEY === 're_test') {
    console.warn('[email] RESEND_API_KEY not configured — skipping role assignment email to', params.to)
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: 'GRC-Nexus <noreply@grcnexus.gov.zw>',
    to: [params.to],
    subject: 'Your GRC-Nexus role has been updated',
    html: `
      <div style="background:#F3F7FD;font-family:'DM Sans',Arial,sans-serif;padding:32px 16px;">
        <div style="max-width:600px;margin:0 auto;">
          <div style="background:#050D1B;padding:24px;border-radius:10px 10px 0 0;">
            <h1 style="color:#C8A44A;margin:0;font-family:Georgia,serif;font-size:24px;">GRC-Nexus</h1>
          </div>
          <div style="background:#fff;padding:32px;border-radius:0 0 10px 10px;border:1px solid #D7E2EF;">
            <h2 style="color:#0B1625;font-size:20px;margin-top:0;">Role Assignment Notification</h2>
            <p style="color:#3A5270;">Dear ${params.name},</p>
            <p style="color:#3A5270;">
              Your role at <strong style="color:#0B1625;">${params.institutionName}</strong> has been set to
              <strong style="color:#0B1625;">${params.role}</strong>.
            </p>
            <p style="color:#3A5270;">You can now sign in to GRC-Nexus and select this role to access the platform.</p>
          </div>
        </div>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Resend email error: ${error.message}`)
  }
}
