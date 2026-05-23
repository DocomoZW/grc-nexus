'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeFileHash } from '@/lib/files/checksum'
import { buildStoragePath } from '@/lib/compliance/compliance-utils'
import {
  obligationSchema,
  attestationSchema,
  type ObligationInput,
  type AttestationInput,
} from '@/lib/schemas/compliance'
import type { AppRole } from '@/types/auth'

// Roles allowed to create/edit obligations and upload evidence (D-32)
const WRITE_ROLES: AppRole[] = ['admin', 'compliance-officer']

// Roles allowed to attest obligations (D-20)
const ATTEST_ROLES: AppRole[] = ['admin', 'ceo', 'compliance-officer']

const GENERIC_ERROR = 'An unexpected error occurred. If this persists, contact your administrator.'

// 25 MB per file (D-14)
const MAX_FILE_BYTES = 25 * 1024 * 1024

// Allowed MIME types (D-13)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'image/jpeg',
  'image/png',
] as const

type ActionResult = { error: string } | { data: { id: string } }

/**
 * Get the authenticated user with role and institution context.
 * Mirrors getWriteContext from lib/risk/actions.ts exactly.
 */
async function getWriteContext(allowedRoles: AppRole[] = WRITE_ROLES) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized.' as const }
  }

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role
  const institutionId = appMeta?.institution_id

  if (!activeRole || !allowedRoles.includes(activeRole as AppRole)) {
    return { error: 'You do not have permission to perform this action.' as const }
  }

  if (!institutionId) {
    return { error: 'Institution context is missing from your token.' as const }
  }

  return { supabase, user, institutionId, activeRole }
}

/**
 * Revalidate all compliance-related paths.
 * Called after any mutation to refresh server component caches.
 */
function revalidateCompliancePaths(obligationId?: string) {
  revalidatePath('/compliance')
  revalidatePath('/compliance/obligations')
  if (obligationId) {
    revalidatePath(`/compliance/obligations/${obligationId}`)
    revalidatePath(`/compliance/obligations/${obligationId}/attest`)
    revalidatePath(`/compliance/obligations/${obligationId}/evidence/upload`)
  }
}

/**
 * Create a new compliance obligation.
 * Requires admin or compliance-officer role (D-32).
 */
export async function createObligation(values: ObligationInput): Promise<ActionResult> {
  const parsed = obligationSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const context = await getWriteContext(WRITE_ROLES)
  if ('error' in context) return { error: context.error ?? GENERIC_ERROR }

  try {
    const { data, error } = await context.supabase
      .from('compliance_obligations')
      .insert({
        ...parsed.data,
        institution_id: context.institutionId,
        created_by: context.user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createObligation] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidateCompliancePaths((data as { id: string }).id)

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[createObligation] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

/**
 * Update an existing compliance obligation.
 * Double-checks institution_id beyond RLS for defence-in-depth (D-32).
 */
export async function updateObligation(
  obligationId: string,
  values: ObligationInput,
): Promise<ActionResult> {
  const parsed = obligationSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const context = await getWriteContext(WRITE_ROLES)
  if ('error' in context) return { error: context.error ?? GENERIC_ERROR }

  try {
    const { data, error } = await context.supabase
      .from('compliance_obligations')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', obligationId)
      .eq('institution_id', context.institutionId)
      .select('id')
      .single()

    if (error) {
      console.error('[updateObligation] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidateCompliancePaths(obligationId)

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[updateObligation] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

/**
 * Upload evidence file for a compliance obligation.
 * Requires admin or compliance-officer role (D-32).
 *
 * Security controls applied (RESEARCH.md threat model):
 * - T-4-02-S: getWriteContext(WRITE_ROLES) validates JWT before any file operation
 * - T-4-02-T: computeFileHash re-computes SHA-256 server-side; client hash is compared but never trusted
 * - T-4-02-T2: upsert: false + collision check before upload (two independent overwrite-prevention layers)
 */
export async function uploadEvidence(formData: FormData): Promise<ActionResult> {
  const context = await getWriteContext(WRITE_ROLES)
  if ('error' in context) return { error: context.error ?? GENERIC_ERROR }

  try {
    const file = formData.get('file') as File | null
    const obligationId = formData.get('obligation_id') as string | null
    const clientHash = formData.get('sha256_hash') as string | null

    if (!file) return { error: 'No file provided.' }
    if (!obligationId) return { error: 'Obligation ID is required.' }
    if (!clientHash) return { error: 'Checksum is required.' }

    // Validate file size (D-14)
    if (file.size > MAX_FILE_BYTES) {
      return { error: 'File size exceeds the 25 MB limit.' }
    }

    // Validate MIME type (D-13)
    const allowedTypes: readonly string[] = ALLOWED_MIME_TYPES
    if (!allowedTypes.includes(file.type)) {
      return { error: 'File type not accepted. Accepted types: PDF, DOCX, XLSX, JPG, PNG.' }
    }

    // Server-side hash re-computation — NEVER trust client-provided hash (T-4-02-T, RESEARCH.md anti-pattern)
    const serverHash = await computeFileHash(file)
    if (serverHash !== clientHash) {
      return { error: 'Checksum mismatch. File may have been modified during upload.' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const storagePath = buildStoragePath(
      context.institutionId,
      obligationId,
      Date.now(),
      serverHash,
      ext,
    )

    // Extract directory prefix for collision check (D-12)
    const pathParts = storagePath.split('/')
    const filename = pathParts.pop() ?? ''
    const prefix = pathParts.join('/')

    // Overwrite prevention check — application layer (T-4-02-T2, D-12)
    const { data: existing } = await context.supabase.storage
      .from('compliance-evidence')
      .list(prefix, { search: filename })

    if (existing && existing.length > 0) {
      return { error: 'Evidence file already exists; upload a new version.' }
    }

    // Upload to Supabase Storage with upsert: false (storage layer guard, T-4-02-T2, Pitfall 3)
    const { error: uploadError } = await context.supabase.storage
      .from('compliance-evidence')
      .upload(storagePath, file, { upsert: false })

    if (uploadError) {
      console.error('[uploadEvidence] Storage upload error:', uploadError)
      return { error: 'Unable to upload evidence. Check your connection and try again.' }
    }

    // Insert evidence record with full metadata (D-11)
    const { data, error } = await context.supabase
      .from('obligation_evidence')
      .insert({
        institution_id: context.institutionId,
        obligation_id: obligationId,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        sha256_hash: serverHash,
        uploaded_by: context.user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[uploadEvidence] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidateCompliancePaths(obligationId)

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[uploadEvidence] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

/**
 * Attest a compliance obligation — append-only, server-side timestamp.
 * Requires admin, ceo, or compliance-officer role (D-20, T-4-02-E).
 *
 * Security controls:
 * - T-4-02-R: attested_at is intentionally omitted from the insert payload — DB default now() is authoritative
 * - T-4-02-E: ATTEST_ROLES enforces only admin/ceo/compliance-officer can attest
 */
export async function attestObligation(
  obligationId: string,
  values: AttestationInput,
): Promise<ActionResult> {
  const parsed = attestationSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const context = await getWriteContext(ATTEST_ROLES)
  if ('error' in context) return { error: context.error ?? GENERIC_ERROR }

  try {
    // Insert new attestation row — NEVER update (D-19, append-only audit trail)
    const { data, error: attestError } = await context.supabase
      .from('obligation_attestations')
      .insert({
        institution_id: context.institutionId,
        obligation_id: obligationId,
        attestation_status: parsed.data.attestation_status,
        attested_by: context.user.id,
        // attested_at: intentionally omitted — DB default now() is authoritative (D-18, Pitfall 4)
        notes: parsed.data.notes ?? null,
      })
      .select('id')
      .single()

    if (attestError) {
      console.error('[attestObligation] Attestation insert error:', attestError)
      return { error: GENERIC_ERROR }
    }

    // Update obligation status to reflect latest attestation (D-19)
    const { error: updateError } = await context.supabase
      .from('compliance_obligations')
      .update({
        status: parsed.data.attestation_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', obligationId)
      .eq('institution_id', context.institutionId)

    if (updateError) {
      console.error('[attestObligation] Status update error:', updateError)
      // Non-fatal for audit trail — attestation row already inserted
    }

    revalidateCompliancePaths(obligationId)

    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[attestObligation] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
