'use server'
// lib/auth/admin-actions.ts
// Server Actions for admin operations: approve, reject, suspend users.
// SECURITY: All actions verify caller has active_role === 'admin' before proceeding.
// SECURITY: Uses createAdminClient() for Supabase admin API (Service Role key, server-side only).

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendRoleAssignmentEmail } from '@/lib/email/send-role-notification'
import { revalidatePath } from 'next/cache'

function assertAdmin(activeRole: string | undefined): boolean {
  return activeRole === 'admin'
}

export async function approveUser(userId: string, role: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // SECURITY: Verify caller is admin
  const appMeta = user?.app_metadata as Record<string, string> | undefined
  if (!user || !assertAdmin(appMeta?.active_role)) {
    return { error: 'Unauthorized.' }
  }

  const institutionId = appMeta?.institution_id

  try {
    // 1. Update user_profiles status to approved
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ status: 'approved' })
      .eq('id', userId)

    if (profileError) throw profileError

    // 2. Insert into user_roles
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        institution_id: institutionId!,
        role_name: role as 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head',
        assigned_by: user.id,
      })

    if (roleError && !roleError.message.includes('duplicate')) throw roleError

    // 3. Update app_metadata via admin API so JWT hook picks it up
    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'approved' },
    })

    // 4. Fetch user details for email notification
    const { data: targetUser } = await admin.auth.admin.getUserById(userId)
    if (targetUser?.user?.email) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single()

      // Fetch institution name
      const { data: institution } = await supabase
        .from('institutions')
        .select('name')
        .eq('id', institutionId!)
        .single()

      try {
        await sendRoleAssignmentEmail({
          to: targetUser.user.email,
          name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'User',
          role,
          institutionName: institution?.name ?? 'Your institution',
        })
      } catch (emailErr) {
        // Non-fatal: log but don't fail the approval
        console.warn('[admin-actions] Role notification email failed:', emailErr)
      }
    }

    // 5. Insert application-layer audit event for AUTH-08 permission change
    await supabase.from('audit_events').insert({
      actor_id: user.id,
      action: 'AUTH' as const,
      table_name: 'user_roles',
      record_id: userId,
      event_type: 'permission_change',
      metadata: { new_role: role, new_status: 'approved' },
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    console.error('[admin-actions] approveUser error:', err)
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
}

export async function rejectUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const appMeta = user?.app_metadata as Record<string, string> | undefined
  if (!user || !assertAdmin(appMeta?.active_role)) {
    return { error: 'Unauthorized.' }
  }

  try {
    const admin = createAdminClient()
    await admin.auth.admin.deleteUser(userId)

    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    console.error('[admin-actions] rejectUser error:', err)
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
}

export async function suspendUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const appMeta = user?.app_metadata as Record<string, string> | undefined
  if (!user || !assertAdmin(appMeta?.active_role)) {
    return { error: 'Unauthorized.' }
  }

  try {
    // 1. Update DB status
    await supabase
      .from('user_profiles')
      .update({ status: 'suspended' })
      .eq('id', userId)

    // 2. Update auth system via admin API
    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'suspended' },
      ban_duration: '876600h', // ~100 years — effectively permanent until reactivated
    })

    // 3. Audit event for AUTH-08 permission change
    await supabase.from('audit_events').insert({
      actor_id: user.id,
      action: 'AUTH' as const,
      table_name: 'user_profiles',
      record_id: userId,
      event_type: 'permission_change',
      metadata: { new_status: 'suspended' },
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    console.error('[admin-actions] suspendUser error:', err)
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
}

export async function reactivateUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const appMeta = user?.app_metadata as Record<string, string> | undefined
  if (!user || !assertAdmin(appMeta?.active_role)) {
    return { error: 'Unauthorized.' }
  }

  try {
    await supabase
      .from('user_profiles')
      .update({ status: 'approved' })
      .eq('id', userId)

    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'approved' },
      ban_duration: 'none',
    })

    await supabase.from('audit_events').insert({
      actor_id: user.id,
      action: 'AUTH' as const,
      table_name: 'user_profiles',
      record_id: userId,
      event_type: 'permission_change',
      metadata: { new_status: 'approved' },
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    console.error('[admin-actions] reactivateUser error:', err)
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
}
