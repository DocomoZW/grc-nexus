'use server'
// lib/auth/actions.ts
// Server Actions for authentication flows.
// SECURITY: All actions validate input with Zod before any Supabase calls.
// SECURITY: Never expose which field failed on auth errors (enumeration prevention).
// SECURITY: Uses getUser() not getSession() after signIn (RESEARCH.md Pitfall 1).
// SECURITY: redirect() must be called OUTSIDE try/catch (throws NextRedirect internally).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loginSchema, registerSchema } from '@/lib/schemas/auth'
import type { LoginInput, RegisterInput } from '@/lib/schemas/auth'

export async function signIn(values: LoginInput) {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) {
    return { error: 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // SECURITY: Never reveal which field is wrong (prevents email enumeration)
    return { error: 'Email address or password is incorrect. Please try again.' }
  }

  // Re-fetch user after sign-in to read JWT claims (RESEARCH.md Pitfall 1 — always getUser())
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }

  const appMeta = user.app_metadata as Record<string, unknown>
  const roles = appMeta?.roles as string[] | undefined
  const status = appMeta?.status as string | undefined

  if (status === 'pending') {
    redirect('/register/pending')
  }

  if (status === 'suspended') {
    await supabase.auth.signOut()
    return { error: 'Your account has been suspended. Contact your institution\'s administrator.' }
  }

  // Insert login audit event (AUTH-08)
  try {
    await supabase.from('audit_events').insert({
      actor_id: user.id,
      action: 'AUTH' as const,
      table_name: 'auth_events',
      record_id: user.id,
      event_type: 'login',
      metadata: {},
    })
  } catch {
    // Non-fatal: audit failure should not block login
  }

  // Route to role-select if user has multiple roles; otherwise go to dashboard
  if (Array.isArray(roles) && roles.length > 1) {
    redirect('/role-select')
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()

  // Insert logout audit event before signing out (AUTH-08)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    try {
      await supabase.from('audit_events').insert({
        actor_id: user.id,
        action: 'AUTH' as const,
        table_name: 'auth_events',
        record_id: user.id,
        event_type: 'logout',
        metadata: {},
      })
    } catch {
      // Non-fatal: audit failure should not block logout
    }
  }

  await supabase.auth.signOut()
  redirect('/login')
}

export async function signUp(values: RegisterInput) {
  const parsed = registerSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
      },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
      return { error: 'An account with this email address already exists. Sign in or contact your administrator.' }
    }
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }

  redirect('/register/pending')
}

export async function selectRole(role: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Validate: role must be in user's assigned roles
  const appMeta = user.app_metadata as Record<string, unknown>
  const assignedRoles = appMeta?.roles as string[] | undefined
  if (!assignedRoles?.includes(role)) {
    return { error: 'Invalid role selection.' }
  }

  // 1. Update user_profiles.active_role in DB
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ active_role: role as 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head' })
    .eq('id', user.id)

  if (profileError) {
    return { error: 'Unable to update role. If this persists, contact your administrator.' }
  }

  // 2. Update app_metadata via admin API so JWT hook sees the new role
  const admin = createAdminClient()
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { active_role: role },
  })

  // 3. Refresh session so JWT claims update immediately (RESEARCH.md Pitfall 3)
  await supabase.auth.refreshSession()

  // 4. Insert role change audit event (AUTH-08)
  try {
    await supabase.from('audit_events').insert({
      actor_id: user.id,
      action: 'AUTH' as const,
      table_name: 'user_profiles',
      record_id: user.id,
      event_type: 'role_change',
      metadata: { new_role: role },
    })
  } catch {
    // Non-fatal
  }

  redirect('/dashboard')
}
