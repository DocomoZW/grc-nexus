// app/api/compliance/evidence/[id]/route.ts
// GET — downloads evidence file from private Supabase Storage with SHA-256 integrity check (D-29 to D-31)
// TRAIL-04: evidence file integrity verified on every download; 409 on mismatch
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyChecksum } from '@/lib/files/checksum'
import type { AppRole } from '@/types/auth'

// Roles permitted to download evidence files (D-32: admin, ceo, compliance-officer, risk-officer, audit-officer, board-member)
// dept-head is excluded — cannot view evidence per role matrix
const VIEW_ROLES: AppRole[] = [
  'admin', 'ceo', 'compliance-officer', 'risk-officer', 'audit-officer', 'board-member'
]

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Step 1: Auth check — always use getUser(), never getSession() (RESEARCH.md anti-patterns)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Step 2: Role check
  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role
  if (!activeRole || !VIEW_ROLES.includes(activeRole as AppRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  // Step 3: Fetch evidence record from DB (RLS enforces institution_id scoping automatically)
  // Cast to typed interface: obligation_evidence not yet in generated types/supabase.ts (added in Phase 4 migrations)
  const { data: evidenceRaw, error: dbError } = await supabase
    .from('obligation_evidence')
    .select('storage_path, sha256_hash, original_filename, mime_type')
    .eq('id', params.id)
    .single()

  interface EvidenceRecord {
    storage_path: string
    sha256_hash: string
    original_filename: string
    mime_type: string
  }

  const evidence = evidenceRaw as EvidenceRecord | null

  if (dbError || !evidence) {
    return new Response('Not found', { status: 404 })
  }

  // Step 4: Download file from private Supabase Storage bucket
  // Do NOT expose direct Storage URLs — always proxy through this route (D-31, RESEARCH.md anti-patterns)
  const { data: blob, error: storageError } = await supabase.storage
    .from('compliance-evidence')
    .download(evidence.storage_path)

  if (storageError || !blob) {
    console.error('[evidence/download] Storage error:', storageError)
    return new Response('Storage error — file may have been deleted', { status: 500 })
  }

  // Step 5: Re-compute SHA-256 and compare to stored hash (TRAIL-04, D-29)
  const bytes = Buffer.from(await blob.arrayBuffer())
  const isValid = verifyChecksum(bytes, evidence.sha256_hash)

  if (!isValid) {
    // D-30: Return 409 with machine-readable error body on integrity mismatch
    return Response.json(
      {
        error: 'integrity_check_failed',
        message: 'File checksum mismatch — evidence may have been modified.',
      },
      { status: 409 }
    )
  }

  // Step 6: Stream verified file as attachment (D-31)
  // RFC 5987 percent-encoding prevents HTTP header injection via filenames containing
  // double-quotes, backslashes, or CRLF sequences (CR-01)
  const encodedFilename = encodeURIComponent(evidence.original_filename)
  return new Response(bytes, {
    headers: {
      'Content-Type': evidence.mime_type,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
