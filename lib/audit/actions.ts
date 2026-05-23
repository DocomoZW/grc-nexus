'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { computeFileHash } from '@/lib/files/checksum'
import {
  auditFindingSchema,
  auditFindingStatusSchema,
  type AuditFindingInput,
  type AuditFindingStatusInput,
} from '@/lib/schemas/audit-findings'
import type { AppRole } from '@/types/auth'
import { buildAuditEvidenceStoragePath, isValidAuditStatusTransition } from '@/lib/audit/audit-utils'

const uuidSchema = z.string().uuid()
const GENERIC_ERROR = 'An unexpected error occurred. If this persists, contact your administrator.'
const MAX_FILE_BYTES = 25 * 1024 * 1024

const CREATE_ROLES: AppRole[] = ['admin', 'audit-officer']

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'image/jpeg',
  'image/png',
] as const

type ActionResult = { error: string } | { data: { id: string } }

async function getContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized.' as const }
  }

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role as AppRole | undefined
  const institutionId = appMeta?.institution_id

  if (!activeRole) {
    return { error: 'Active role is missing from your token.' as const }
  }

  if (!institutionId) {
    return { error: 'Institution context is missing from your token.' as const }
  }

  return { supabase, user, activeRole, institutionId }
}

function revalidateAuditPaths(findingId?: string) {
  revalidatePath('/audit')
  revalidatePath('/audit/findings')
  revalidatePath('/audit/findings/new')
  if (findingId) {
    revalidatePath(`/audit/findings/${findingId}`)
    revalidatePath(`/audit/findings/${findingId}/evidence/upload`)
  }
}

export async function createAuditFinding(values: AuditFindingInput): Promise<ActionResult> {
  const parsed = auditFindingSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const context = await getContext()
  if ('error' in context) return { error: context.error ?? GENERIC_ERROR }

  if (!CREATE_ROLES.includes(context.activeRole)) {
    return { error: 'You do not have permission to create audit findings.' }
  }

  try {
    const { data, error } = await context.supabase
      .from('audit_findings')
      .insert({
        ...parsed.data,
        institution_id: context.institutionId,
        created_by: context.user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createAuditFinding] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    const findingId = (data as { id: string }).id
    revalidateAuditPaths(findingId)
    return { data: { id: findingId } }
  } catch (err) {
    console.error('[createAuditFinding] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

export async function updateAuditFindingStatus(
  findingId: string,
  values: AuditFindingStatusInput,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(findingId).success) {
    return { error: 'Invalid finding ID.' }
  }

  const parsed = auditFindingStatusSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const context = await getContext()
  if ('error' in context) return { error: context.error ?? GENERIC_ERROR }

  try {
    const { data: finding, error: findingError } = await context.supabase
      .from('audit_findings')
      .select('id, status, remediation_owner_id')
      .eq('id', findingId)
      .eq('institution_id', context.institutionId)
      .single()

    if (findingError || !finding) {
      return { error: 'Finding not found.' }
    }

    const current = finding as {
      id: string
      status: 'open' | 'in_progress' | 'closed'
      remediation_owner_id: string | null
    }

    const isOwner = current.remediation_owner_id === context.user.id
    const canManage = context.activeRole === 'admin' || context.activeRole === 'audit-officer'

    if (!canManage && !isOwner) {
      return { error: 'You do not have permission to update this finding.' }
    }

    if (!isValidAuditStatusTransition(current.status, parsed.data.status)) {
      return { error: `Invalid transition from ${current.status} to ${parsed.data.status}.` }
    }

    const payload: Record<string, string | null> = {
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
      closed_at: parsed.data.status === 'closed' ? new Date().toISOString() : null,
    }

    const { data, error } = await context.supabase
      .from('audit_findings')
      .update(payload)
      .eq('id', findingId)
      .eq('institution_id', context.institutionId)
      .select('id')
      .single()

    if (error) {
      console.error('[updateAuditFindingStatus] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidateAuditPaths(findingId)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[updateAuditFindingStatus] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

export async function uploadAuditFindingEvidence(formData: FormData): Promise<ActionResult> {
  const context = await getContext()
  if ('error' in context) return { error: context.error ?? GENERIC_ERROR }

  try {
    const findingId = formData.get('finding_id') as string | null
    const file = formData.get('file') as File | null
    const clientHash = formData.get('sha256_hash') as string | null

    if (!findingId || !uuidSchema.safeParse(findingId).success) {
      return { error: 'Invalid finding ID.' }
    }
    if (!file) return { error: 'No file provided.' }
    if (!clientHash) return { error: 'Checksum is required.' }

    if (file.size > MAX_FILE_BYTES) {
      return { error: 'File size exceeds the 25 MB limit.' }
    }

    const allowedTypes: readonly string[] = ALLOWED_MIME_TYPES
    if (!allowedTypes.includes(file.type)) {
      return { error: 'File type not accepted. Accepted types: PDF, DOCX, XLSX, JPG, PNG.' }
    }

    const { data: finding, error: findingError } = await context.supabase
      .from('audit_findings')
      .select('id, remediation_owner_id')
      .eq('id', findingId)
      .eq('institution_id', context.institutionId)
      .single()

    if (findingError || !finding) {
      return { error: 'Finding not found.' }
    }

    const findingRow = finding as { id: string; remediation_owner_id: string | null }
    const isOwner = findingRow.remediation_owner_id === context.user.id
    const canManage = context.activeRole === 'admin' || context.activeRole === 'audit-officer'

    if (!canManage && !isOwner) {
      return { error: 'You do not have permission to upload evidence for this finding.' }
    }

    const serverHash = await computeFileHash(file)
    if (serverHash !== clientHash) {
      return { error: 'Checksum mismatch. File may have been modified during upload.' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const storagePath = buildAuditEvidenceStoragePath(
      context.institutionId,
      findingId,
      Date.now(),
      serverHash,
      ext,
    )

    const pathParts = storagePath.split('/')
    const filename = pathParts.pop() ?? ''
    const prefix = pathParts.join('/')

    const { data: existing } = await context.supabase.storage
      .from('audit-evidence')
      .list(prefix, { search: filename })

    if (existing && existing.length > 0) {
      return { error: 'Evidence file already exists; upload a new version.' }
    }

    const { error: uploadError } = await context.supabase.storage
      .from('audit-evidence')
      .upload(storagePath, file, { upsert: false })

    if (uploadError) {
      const isDuplicate =
        uploadError.message?.toLowerCase().includes('already exists') ||
        (uploadError as unknown as { statusCode?: string }).statusCode === '23505'
      if (isDuplicate) {
        return { error: 'Evidence file already exists; upload a new version.' }
      }
      console.error('[uploadAuditFindingEvidence] Storage error:', uploadError)
      return { error: 'Unable to upload evidence. Check your connection and try again.' }
    }

    const { data, error } = await context.supabase
      .from('audit_finding_evidence')
      .insert({
        institution_id: context.institutionId,
        finding_id: findingId,
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
      console.error('[uploadAuditFindingEvidence] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidateAuditPaths(findingId)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('[uploadAuditFindingEvidence] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
