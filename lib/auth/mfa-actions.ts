'use server'
// lib/auth/mfa-actions.ts
// Server Actions for MFA operations: save backup codes, complete MFA challenge, device trust.
// SECURITY: All actions verify session via getUser() before proceeding.
// SECURITY: redirect() called outside try/catch (throws NextRedirect internally).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateRecoveryCodes, hashRecoveryCodes, verifyRecoveryCode } from '@/lib/auth/recovery-codes'
import { setDeviceTrust } from '@/lib/auth/device-trust'

/**
 * Save hashed backup codes for the current user.
 * Replaces any existing codes (called after TOTP or email OTP setup completes).
 */
export async function saveBackupCodes(hashedCodes: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  // Delete any existing codes first
  await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)

  // Insert new hashed codes
  const { error } = await supabase.from('mfa_backup_codes').insert(
    hashedCodes.map((code_hash) => ({ user_id: user.id, code_hash }))
  )

  if (error) {
    return { error: 'Failed to save backup codes. Please try again.' }
  }

  return { success: true }
}

/**
 * Complete a TOTP MFA challenge.
 * Called from the /mfa/challenge screen after TOTP verification.
 * On success: optionally sets device trust cookie and redirects to /dashboard.
 */
export async function completeMFAChallengeAction(
  factorId: string,
  code: string,
  trustDevice: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please sign in again.' }

  // Create challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (challengeError) {
    return { error: 'Failed to initiate MFA challenge. Please try again.' }
  }

  // Verify code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })

  if (verifyError) {
    return { error: 'Invalid verification code. Please try again or request a new code.' }
  }

  if (trustDevice) {
    await setDeviceTrust(user.id)
  }

  // Insert audit event for successful MFA verification
  try {
    await supabase.from('audit_events').insert({
      actor_id: user.id,
      action: 'AUTH' as const,
      table_name: 'auth_events',
      record_id: user.id,
      event_type: 'mfa_verified',
      metadata: { method: 'totp' },
    })
  } catch {
    // Non-fatal
  }

  redirect('/dashboard')
}

/**
 * Complete MFA challenge using a backup recovery code.
 * Marks the used code as consumed and optionally sets device trust.
 */
export async function useBackupCodeAction(code: string, trustDevice: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please sign in again.' }

  // Fetch all unused backup codes for this user
  const { data: codes } = await supabase
    .from('mfa_backup_codes')
    .select('id, code_hash')
    .eq('user_id', user.id)
    .is('used_at', null)

  if (!codes || codes.length === 0) {
    return { error: 'No backup codes available. Contact your administrator.' }
  }

  // Verify against each stored hash
  const matchIndex = await verifyRecoveryCode(code, codes.map((c) => c.code_hash))
  if (matchIndex === null) {
    return {
      error: 'Backup code not recognised. Verify the code and try again. Each code can only be used once.',
    }
  }

  // Mark matched code as used
  await supabase
    .from('mfa_backup_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', codes[matchIndex].id)

  if (trustDevice) {
    await setDeviceTrust(user.id)
  }

  // Audit event
  try {
    await supabase.from('audit_events').insert({
      actor_id: user.id,
      action: 'AUTH' as const,
      table_name: 'auth_events',
      record_id: user.id,
      event_type: 'mfa_verified',
      metadata: { method: 'backup_code' },
    })
  } catch {
    // Non-fatal
  }

  redirect('/dashboard')
}

/**
 * Regenerate backup codes for the current user.
 * Invalidates all existing codes and generates 8 new ones.
 * Returns plain-text codes — shown once, never stored in plain form.
 */
export async function regenerateBackupCodesAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const codes = generateRecoveryCodes()
  const hashed = await hashRecoveryCodes(codes)

  // Delete old codes
  await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)

  // Insert new hashed codes
  const { error } = await supabase.from('mfa_backup_codes').insert(
    hashed.map((code_hash) => ({ user_id: user.id, code_hash }))
  )

  if (error) {
    return { error: 'Failed to regenerate backup codes. Please try again.' }
  }

  return { success: true, codes } // Return plain codes — shown once
}
