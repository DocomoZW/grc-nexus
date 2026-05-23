import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMeetingById } from '@/lib/board/queries'
import { ActionItemForm } from './ActionItemForm'

export const dynamic = 'force-dynamic'

const WRITE_ROLES = ['admin', 'ceo', 'board-member', 'board-secretary']

export default async function NewActionItemPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRole = (user.app_metadata as Record<string, string>)?.active_role
  if (!activeRole || !WRITE_ROLES.includes(activeRole)) redirect(`/board/meetings/${params.id}`)

  const meeting = await getMeetingById(supabase, params.id)
  if (!meeting || meeting.status === 'closed') {
    redirect(`/board/meetings/${params.id}`)
  }

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('status', 'approved')
    .order('last_name')

  const members = (profiles ?? []).map((row) => {
    const r = row as { id: string; first_name?: string | null; last_name?: string | null }
    return { id: r.id, name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.id }
  })

  return (
    <div>
      <h1 className="mb-1 text-[28px] font-heading font-semibold text-navy-950">Add Action Item</h1>
      <p className="mb-6 text-[14px] text-navy-mid">Track board decisions through assigned actions.</p>
      <ActionItemForm meetingId={params.id} members={members} />
    </div>
  )
}
