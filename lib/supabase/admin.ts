// lib/supabase/admin.ts
// SERVICE ROLE client for admin operations (user approval, role assignment).
// SERVER-SIDE ONLY. NEVER import in client components or expose to browser.
// Uses SUPABASE_SERVICE_ROLE_KEY — no NEXT_PUBLIC_ prefix by design.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // NO NEXT_PUBLIC_ prefix — server only
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
