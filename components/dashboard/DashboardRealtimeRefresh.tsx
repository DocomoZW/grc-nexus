'use client'
// components/dashboard/DashboardRealtimeRefresh.tsx
// Subscribes to Supabase Realtime changes on key governance tables and refreshes
// the dashboard server component within 5 seconds of any relevant change.
// SECURITY: Supabase RLS ensures only institution-scoped rows trigger events.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  institutionId: string
}

const WATCHED_TABLES = [
  'risks',
  'compliance_obligations',
  'incidents',
  'kri_readings',
  'kci_readings',
  'audit_findings',
]

export function DashboardRealtimeRefresh({ institutionId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase.channel(`dashboard-refresh:${institutionId}`)

    for (const table of WATCHED_TABLES) {
      channel.on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table,
          filter: `institution_id=eq.${institutionId}`,
        },
        () => {
          router.refresh()
        },
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [institutionId, router])

  return null
}
