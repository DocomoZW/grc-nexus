// app/api/mfa/email-otp/route.ts
// Custom email OTP MFA endpoint.
// POST { action: 'send' } — generates and emails a 6-digit OTP code.
// POST { action: 'verify', code: string } — verifies submitted code against stored hash.
// SECURITY: Caller must be authenticated (getUser() check).
// SECURITY: OTP stored as bcrypt hash; plain code only in email.
// SECURITY: Previous unused codes invalidated on new send.
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { generateOTPCode, hashOTPCode, verifyOTPCode } from '@/lib/auth/email-otp'

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // ── SEND ──────────────────────────────────────────────────────────────────
  if (body.action === 'send') {
    // 1. Generate + hash OTP
    const code = generateOTPCode()
    const codeHash = await hashOTPCode(code)

    // 2. Invalidate previous unused challenges for this user
    await supabase
      .from('mfa_otp_challenges')
      .delete()
      .eq('user_id', user.id)
      .is('used_at', null)

    // 3. Insert new challenge with 10-minute TTL
    const { error: insertError } = await supabase.from('mfa_otp_challenges').insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    })

    if (insertError) {
      console.error('[email-otp] Failed to insert OTP challenge:', insertError)
      return NextResponse.json({ error: 'Failed to create verification code. Please try again.' }, { status: 500 })
    }

    // 4. Send via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey || resendKey === 're_xxxx' || resendKey === 're_test') {
      // Dev environment — log code instead of sending
      console.info(`[email-otp] DEV: OTP code for ${user.email}: ${code}`)
      return NextResponse.json({ success: true, _dev_code: code })
    }

    const resend = new Resend(resendKey)
    const { error: emailError } = await resend.emails.send({
      from: 'GRC-Nexus <noreply@grcnexus.gov.zw>',
      to: [user.email!],
      subject: 'Your GRC-Nexus verification code',
      html: `
        <div style="background:#F3F7FD;font-family:'DM Sans',Arial,sans-serif;padding:32px 16px;">
          <div style="max-width:480px;margin:0 auto;">
            <div style="background:#050D1B;padding:20px 24px;border-radius:10px 10px 0 0;">
              <h1 style="color:#C8A44A;margin:0;font-family:Georgia,serif;font-size:22px;">GRC-Nexus</h1>
            </div>
            <div style="background:#fff;padding:32px;border-radius:0 0 10px 10px;border:1px solid #D7E2EF;">
              <h2 style="color:#0B1625;font-size:18px;margin-top:0;">Your verification code</h2>
              <p style="color:#3A5270;font-size:14px;">Use the code below to complete your sign-in. This code expires in 10 minutes.</p>
              <div style="text-align:center;margin:24px 0;">
                <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0B1625;font-family:'Courier New',monospace;">
                  ${code}
                </span>
              </div>
              <p style="color:#3A5270;font-size:13px;margin:0;">
                If you did not request this code, someone may be attempting to access your account.
                Please contact your administrator immediately.
              </p>
            </div>
          </div>
        </div>
      `,
    })

    if (emailError) {
      console.error('[email-otp] Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send verification code. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // ── VERIFY ────────────────────────────────────────────────────────────────
  if (body.action === 'verify') {
    const { code } = body
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 })
    }

    // 1. Find most recent unexpired, unused challenge for this user
    const { data: challenge } = await supabase
      .from('mfa_otp_challenges')
      .select('id, code_hash, expires_at')
      .eq('user_id', user.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!challenge) {
      return NextResponse.json(
        { error: 'MFA code expired or not found. Please request a new code.' },
        { status: 400 }
      )
    }

    // 2. Verify hash
    const valid = await verifyOTPCode(code, challenge.code_hash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 }
      )
    }

    // 3. Mark as used (single-use enforcement)
    await supabase
      .from('mfa_otp_challenges')
      .update({ used_at: new Date().toISOString() })
      .eq('id', challenge.id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
