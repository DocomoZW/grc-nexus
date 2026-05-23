import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/auth'
import { getExecutiveDashboardData } from '@/lib/reporting/queries'
import { buildGovernanceSummaryPdf } from '@/lib/reporting/pdf'

const ALLOWED_ROLES: AppRole[] = ['admin', 'ceo', 'audit-officer']

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const appMeta = user.app_metadata as Record<string, unknown>
  const activeRole = appMeta.active_role as AppRole | undefined

  if (!activeRole || !ALLOWED_ROLES.includes(activeRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  const url = new URL(request.url)
  const filterInput = {
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    department: url.searchParams.get('department') ?? undefined,
    module: url.searchParams.get('module') ?? undefined,
  }

  const reportData = await getExecutiveDashboardData(supabase, filterInput)
  const bytes = await buildGovernanceSummaryPdf(reportData)
  const body = bytes.buffer as ArrayBuffer

  const filename = `governance-summary-${Date.now()}.pdf`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
