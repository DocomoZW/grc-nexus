// app/(protected)/admin/users/page.tsx
// Admin user management page — lists all users with approval queue.
// SECURITY: force-dynamic prevents ISR caching of user data.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserManagementTable } from './UserManagementTable'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Fetch user profiles joined with roles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select(`
      id,
      first_name,
      last_name,
      status,
      active_role,
      institution_id,
      created_at,
      user_roles (role_name)
    `)
    .order('created_at', { ascending: false })

  // Fetch auth users for email addresses (not directly queryable via RLS)
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers()

  // Merge auth user emails with profiles
  const usersWithEmail = (profiles ?? []).map((profile) => {
    const authUser = authUsers.find((u) => u.id === profile.id)
    return {
      ...profile,
      email: authUser?.email ?? '',
    }
  })

  const pendingCount = usersWithEmail.filter((u) => u.status === 'pending').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-navy-900 font-body">User Management</h1>
          <p className="text-[14px] text-navy-mid mt-1">
            Manage institutional users, roles, and approvals
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium bg-gold-pale text-navy-950 border border-gold/40">
            {pendingCount} pending
          </span>
        )}
      </div>

      <UserManagementTable users={usersWithEmail} />
    </div>
  )
}
