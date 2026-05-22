// lib/auth/mfa.ts
// TOTP MFA helpers using Supabase native MFA (supabase.auth.mfa.*).
// All functions use createClient() from the browser client — for use in Client Components.
// SECURITY: Never call these from Server Components or Route Handlers; use server.ts client there.
import { createClient } from '@/lib/supabase/client'

/**
 * Begin TOTP enrollment — returns QR code URI and factor ID.
 * Call this on mount in the TOTP setup step.
 */
export async function enrollTOTP() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'GRC-Nexus',
  })

  if (error) {
    return { error: error.message }
  }

  return {
    factorId: data.id,
    qrCodeUri: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

/**
 * Verify TOTP code during enrollment to confirm the factor.
 * Must be called after enrollTOTP() with the code the user entered.
 */
export async function verifyTOTPEnrollment(factorId: string, code: string) {
  const supabase = createClient()

  // Step 1: Create a challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (challengeError) {
    return { error: challengeError.message }
  }

  // Step 2: Verify the challenge with the user's code
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })

  if (error) {
    return { error: 'Invalid verification code. Please try again.' }
  }

  return { success: true, data }
}

/**
 * Complete an MFA challenge (post-login verification).
 * Used on the /mfa/challenge screen after user enters their TOTP code.
 */
export async function completeMFAChallenge(factorId: string, code: string) {
  const supabase = createClient()

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (challengeError) {
    return { error: challengeError.message }
  }

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })

  if (error) {
    return { error: 'Invalid verification code. Please try again.' }
  }

  return { success: true, data }
}

/**
 * Get the current MFA Assurance Level (AAL).
 * aal1 = password only; aal2 = password + MFA verified.
 */
export async function getMFALevel() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (error) {
    return { currentLevel: 'aal1' as const, error: error.message }
  }

  return {
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
  }
}

/**
 * List all enrolled MFA factors for the current user.
 * Returns array of factors with id, factorType, status.
 */
export async function listMFAFactors() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.listFactors()

  if (error) {
    return { factors: [], error: error.message }
  }

  return { factors: data.all ?? [] }
}

/**
 * Unenroll an MFA factor by ID.
 * Called when user wants to remove an authenticator app.
 */
export async function unenrollFactor(factorId: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
