// lib/auth/email-otp.ts
// Custom email OTP MFA — Supabase does not support email as an MFA factor type natively.
// See RESEARCH.md Pitfall 7 and Open Question 1.
// SECURITY: Uses crypto.randomBytes — never Math.random().
// SECURITY: OTP hashed with bcrypt for storage; plain code transmitted via Resend only.
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const OTP_BCRYPT_COST = 10 // Lower cost for OTP — short TTL reduces attack window

/**
 * Generate a cryptographically secure 6-digit OTP code.
 * Padded to ensure always exactly 6 digits.
 */
export function generateOTPCode(): string {
  const bytes = crypto.randomBytes(4)
  const num = bytes.readUInt32BE(0) % 1_000_000
  return num.toString().padStart(6, '0')
}

/**
 * Hash an OTP code for secure DB storage.
 * Uses bcrypt cost 10 — acceptable given OTP's 10-minute TTL.
 */
export async function hashOTPCode(code: string): Promise<string> {
  return bcrypt.hash(code, OTP_BCRYPT_COST)
}

/**
 * Verify a submitted OTP code against its stored bcrypt hash.
 * Returns true if the code matches, false otherwise.
 */
export async function verifyOTPCode(submitted: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(submitted, storedHash)
}
