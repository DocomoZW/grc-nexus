// lib/notifications/insert.ts
// Helper for inserting notifications from server-side services (admin client).
// SECURITY: Uses service-role client — only call from trusted server contexts.

import { createAdminClient } from '@/lib/supabase/admin'
import type { SourceModule } from '@/types/notifications'

interface InsertNotificationParams {
  institutionId: string
  userId:        string
  title:         string
  body?:         string
  link?:         string
  sourceModule?: SourceModule
}

export async function insertNotification(params: InsertNotificationParams): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('notifications').insert({
    institution_id: params.institutionId,
    user_id:        params.userId,
    title:          params.title,
    body:           params.body ?? null,
    link:           params.link ?? null,
    source_module:  params.sourceModule ?? null,
  })

  if (error) {
    console.error('[insertNotification] Failed to insert notification:', error)
  }
}
