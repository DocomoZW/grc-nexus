// app/api/audit/auto-findings/route.ts
// CRON route: scan failed test procedures and auto-create audit findings if none exist.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 })
  }

  const admin = createAdminClient(supabaseUrl, serviceKey)

  // 1. Fetch all failed procedures that have no linked audit finding
  const { data: failedProcs, error: procErr } = await admin
    .from('audit_test_procedures')
    .select('id, institution_id, engagement_id, objective, step_number, created_by')
    .eq('result', 'fail')

  if (procErr) {
    return NextResponse.json({ error: procErr.message }, { status: 500 })
  }

  if (!failedProcs || failedProcs.length === 0) {
    return NextResponse.json({ created: 0 })
  }

  // 2. Fetch existing findings that reference these procedures via description pattern
  //    We match on a deterministic title: "Procedure #N failed — engagement <id>"
  const findingTitles = failedProcs.map(
    (p) => `Auto: Procedure #${p.step_number} failed (engagement ${p.engagement_id})`
  )

  const { data: existingFindings } = await admin
    .from('audit_findings')
    .select('title')
    .in('title', findingTitles)

  const existingTitles = new Set((existingFindings ?? []).map((f: { title: string }) => f.title))

  // 3. Create findings for procedures that don't have one yet
  const toCreate = failedProcs.filter((p) => {
    const title = `Auto: Procedure #${p.step_number} failed (engagement ${p.engagement_id})`
    return !existingTitles.has(title)
  })

  if (toCreate.length === 0) {
    return NextResponse.json({ created: 0 })
  }

  const newFindings = toCreate.map((p) => ({
    institution_id:     p.institution_id,
    title:              `Auto: Procedure #${p.step_number} failed (engagement ${p.engagement_id})`,
    description:        `Test procedure objective: ${p.objective}. Auto-generated from failed audit test procedure ID ${p.id}.`,
    severity:           'medium',
    status:             'open',
    linked_entity_type: 'audit_engagement',
    linked_entity_id:   p.engagement_id,
    created_by:         p.created_by,
  }))

  const { data: created, error: insertErr } = await admin
    .from('audit_findings')
    .insert(newFindings)
    .select('id')

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ created: (created ?? []).length })
}
