'use server'
// lib/qms/actions.ts
// Phase 13 — QMS server actions.
// SECURITY: Zod safeParse; institution_id from JWT only.

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const GENERIC_ERROR = 'An unexpected error occurred.'
const WRITE_ROLES   = ['admin', 'compliance-officer', 'audit-officer'] as const
type WriteRole = typeof WRITE_ROLES[number]
type ActionResult = { error: string } | { data: { id: string } }

type CtxError = { error: 'Unauthorized.' | 'Missing token claims.' }
type CtxOk    = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; activeRole: string; institutionId: string }

async function getCtx(): Promise<CtxError | CtxOk> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' as const }
  const appMeta       = user.app_metadata as Record<string, string>
  const activeRole    = appMeta?.active_role as string | undefined
  const institutionId = appMeta?.institution_id as string | undefined
  if (!activeRole || !institutionId) return { error: 'Missing token claims.' as const }
  return { supabase, userId: user.id as string, activeRole, institutionId }
}

// ── Document actions ─────────────────────────────────────────────────────────

const docSchema = z.object({
  doc_code:     z.string().min(1).max(50),
  title:        z.string().min(2).max(300),
  doc_type:     z.enum(['procedure','policy','work_instruction','form','record','manual']),
  review_due_at:z.string().optional().or(z.literal('')).transform(v => v || null),
  file_url:     z.string().url().optional().or(z.literal('')).transform(v => v || null),
})

export async function createQmsDocument(
  values: z.input<typeof docSchema>,
): Promise<ActionResult> {
  const parsed = docSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to create QMS documents.' }
  }

  try {
    const { data, error } = await ctx.supabase
      .from('qms_documents')
      .insert({ ...parsed.data, institution_id: ctx.institutionId, created_by: ctx.userId })
      .select('id').single()

    if (error) { console.error('[createQmsDocument]', error); return { error: GENERIC_ERROR } }
    revalidatePath('/qms')
    return { data: { id: (data as { id: string }).id } }
  } catch (err) { console.error(err); return { error: GENERIC_ERROR } }
}

// ── Non-conformance actions ──────────────────────────────────────────────────

const ncSchema = z.object({
  nc_number:   z.string().min(1).max(50),
  title:       z.string().min(2).max(300),
  description: z.string().min(10),
  source:      z.enum(['internal_audit','external_audit','customer_complaint','process_observation','supplier','other']),
  severity:    z.enum(['minor','major','critical']),
  due_date:    z.string().optional().or(z.literal('')).transform(v => v || null),
})

export async function createNonConformance(
  values: z.input<typeof ncSchema>,
): Promise<ActionResult> {
  const parsed = ncSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to log non-conformances.' }
  }

  try {
    const { data, error } = await ctx.supabase
      .from('non_conformances')
      .insert({ ...parsed.data, institution_id: ctx.institutionId, created_by: ctx.userId })
      .select('id').single()

    if (error) { console.error('[createNonConformance]', error); return { error: GENERIC_ERROR } }
    revalidatePath('/qms/nc')
    return { data: { id: (data as { id: string }).id } }
  } catch (err) { console.error(err); return { error: GENERIC_ERROR } }
}

// ── Update NC status ─────────────────────────────────────────────────────────

const ncStatusSchema = z.object({
  status:            z.enum(['open','root_cause_analysis','corrective_action','verification','closed']),
  root_cause:        z.string().optional().or(z.literal('')).transform(v => v || null),
  corrective_action: z.string().optional().or(z.literal('')).transform(v => v || null),
})
const uuidSchema = z.string().uuid()

export async function updateNcStatus(
  id: string,
  values: z.input<typeof ncStatusSchema>,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: 'Invalid NC ID.' }
  const parsed = ncStatusSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  if (!WRITE_ROLES.includes(ctx.activeRole as WriteRole)) {
    return { error: 'You do not have permission to update non-conformances.' }
  }

  const extra: Record<string, unknown> = {}
  if (parsed.data.status === 'closed') extra.closed_at = new Date().toISOString()

  try {
    const { data, error } = await ctx.supabase
      .from('non_conformances')
      .update({ ...parsed.data, ...extra })
      .eq('id', id)
      .select('id').single()

    if (error) { console.error('[updateNcStatus]', error); return { error: GENERIC_ERROR } }
    revalidatePath('/qms/nc')
    revalidatePath(`/qms/nc/${id}`)
    return { data: { id: (data as { id: string }).id } }
  } catch (err) { console.error(err); return { error: GENERIC_ERROR } }
}
