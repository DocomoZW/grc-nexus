// lib/supabase/server.ts
// Server-side Supabase client for Server Components and Route Handlers.
// CRITICAL: Always use supabase.auth.getUser() — NEVER getSession() in server context.
// See: RESEARCH.md Pitfall 1
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components are read-only during render.
            // Token refresh happens in middleware before render — this catch is intentional.
            // See: RESEARCH.md Pitfall 6.
          }
        },
      },
    }
  )
}
