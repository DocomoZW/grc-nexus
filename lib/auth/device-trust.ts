// lib/auth/device-trust.ts
// 30-day device trust via HMAC-SHA256 cookie + mfa_device_trust DB table.
// SECURITY: Token stored as hash in DB; raw token in httpOnly cookie only.
// SECURITY: Uses crypto.createHmac with DEVICE_TRUST_SECRET — never Math.random().
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const DEVICE_TRUST_COOKIE = 'grc_device_trust'
const TRUST_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * Set device trust for a user after successful MFA verification.
 * Generates an HMAC-SHA256 token, stores its hash in DB, sets httpOnly cookie.
 */
export async function setDeviceTrust(userId: string): Promise<void> {
  const secret = process.env.DEVICE_TRUST_SECRET
  if (!secret) {
    console.warn('[device-trust] DEVICE_TRUST_SECRET not set — device trust disabled')
    return
  }

  // Generate HMAC token
  const token = crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${Date.now()}`)
    .digest('hex')

  // Hash token for DB storage (second hash layer — token in cookie, hash in DB)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const expiresAt = new Date(Date.now() + TRUST_DURATION_MS)

  // Store in DB
  const supabase = await createClient()
  await supabase.from('mfa_device_trust').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  })

  // Set httpOnly cookie (not accessible to JavaScript)
  const cookieStore = await cookies()
  cookieStore.set(DEVICE_TRUST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TRUST_DURATION_MS / 1000, // seconds
    path: '/',
  })
}

/**
 * Validate device trust cookie against DB hash.
 * Returns true if the device is trusted and not expired.
 * SECURITY: Validates expiry at DB layer, not just cookie maxAge.
 */
export async function validateDeviceTrust(
  cookieValue: string,
  userId: string
): Promise<boolean> {
  if (!cookieValue || !userId) return false

  const tokenHash = crypto.createHash('sha256').update(cookieValue).digest('hex')

  const supabase = await createClient()
  const { data } = await supabase
    .from('mfa_device_trust')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single()

  return !!data
}

/**
 * Get the device trust cookie value (for use in middleware).
 * Returns null if cookie is not present.
 */
export function getDeviceTrustCookie(): string | null {
  // Note: cookies() in middleware must be called synchronously in Next.js 14
  // This helper is for Server Components and Route Handlers only.
  // In middleware, read cookie directly from request.cookies.
  return null // Stub — middleware reads cookie directly
}

/**
 * Clear device trust for a user (on logout or security reset).
 */
export async function clearDeviceTrust(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('mfa_device_trust').delete().eq('user_id', userId)

  const cookieStore = await cookies()
  cookieStore.delete(DEVICE_TRUST_COOKIE)
}
