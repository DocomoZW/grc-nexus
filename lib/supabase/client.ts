// lib/supabase/client.ts
// Browser-side Supabase client — exclusively for 'use client' components.
// NEVER import this in Server Components or Route Handlers.
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
