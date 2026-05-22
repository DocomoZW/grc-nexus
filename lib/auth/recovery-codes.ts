// lib/auth/recovery-codes.ts
// Backup/recovery code generation, hashing, and verification.
// SECURITY: Uses crypto.randomBytes ONLY — never Math.random().
// SECURITY: Hashes codes with bcrypt cost 12 for storage; plain codes shown once at generation.
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const BACKUP_CODE_COUNT = 8
const BCRYPT_COST = 12

/**
 * Generate 8 cryptographically random backup codes.
 * Format: XXXX-XXXX (8 hex chars with hyphen for readability).
 * Returns plain text codes — shown once, never stored in plain form.
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const bytes = crypto.randomBytes(4)
    const hex = bytes.toString('hex').toUpperCase()
    // Format as XXXX-XXXX
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`)
  }
  return codes
}

/**
 * Hash all backup codes with bcrypt for DB storage.
 * bcrypt cost 12 — high enough to resist offline attack given limited backup code uses.
 * Returns array of hashed codes in same order as input.
 */
export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, BCRYPT_COST)))
}

/**
 * Verify a submitted backup code against an array of stored hashes.
 * Returns the index of the matching code, or null if no match.
 * SECURITY: Iterates all codes (no early exit) to prevent timing attacks.
 */
export async function verifyRecoveryCode(
  submitted: string,
  storedHashes: string[]
): Promise<number | null> {
  let matchIndex: number | null = null

  await Promise.all(
    storedHashes.map(async (hash, idx) => {
      const matches = await bcrypt.compare(submitted, hash)
      if (matches) {
        matchIndex = idx
      }
    })
  )

  return matchIndex
}
