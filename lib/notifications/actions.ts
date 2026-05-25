'use server'
// lib/notifications/actions.ts
// Server actions for marking notifications read.
// NOTE: Inserting notifications happens via admin client in escalation services —
// see lib/notifications/insert.ts for the helper.
// SECURITY: Users can only update their own notifications.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const uuidSchema    = z.string().uuid()
const GENERIC_ERROR = 'An unexpected error occurred.'

type AuthCtxError = { error: 'Unauthorized.' | 'Missing token claims.' }
type AuthCtxOk = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; institutionId: string }

async function getAuthCtx(): Promise<AuthCtxError | AuthCtxOk> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' as const }
  const appMeta      = user.app_metadata as Record<string, string>
  const institutionId = appMeta?.institution_id as string | undefined
  if (!institutionId) return { error: 'Missing token claims.' as const }
  return { supabase, userId: user.id as string, institutionId: institutionId as string }
}

type ActionResult = { error: string } | { data: { count: number } }

export async function markNotificationRead(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: 'Invalid notification ID.' }
  const ctx = await getAuthCtx()
  if ('error' in ctx) return { error: ctx.error }

  try {
    const { error } = await ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ctx.userId)
      .is('read_at', null)

    if (error) {
      console.error('[markNotificationRead] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/')
    return { data: { count: 1 } }
  } catch (err) {
    console.error('[markNotificationRead] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const ctx = await getAuthCtx()
  if ('error' in ctx) return { error: ctx.error }

  try {
    const { error, count } = await ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', ctx.userId)
      .eq('institution_id', ctx.institutionId)
      .is('read_at', null)

    if (error) {
      console.error('[markAllNotificationsRead] DB error:', error)
      return { error: GENERIC_ERROR }
    }

    revalidatePath('/')
    return { data: { count: count ?? 0 } }
  } catch (err) {
    console.error('[markAllNotificationsRead] Unexpected error:', err)
    return { error: GENERIC_ERROR }
  }
}
