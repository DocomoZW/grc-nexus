import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, CheckSquare, AlertTriangle, Gavel } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getBoardStats, listActionItems, listMeetings } from '@/lib/board/queries'
import { ComplianceStatCard } from '@/components/compliance/ComplianceStatCard'
import { MEETING_STATUS_BADGE, ACTION_STATUS_BADGE } from '@/types/board'

export const dynamic = 'force-dynamic'

const VIEW_ROLES = ['admin', 'ceo', 'board-member', 'board-secretary', 'audit-officer', 'risk-officer']

export default async function BoardDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appMeta = user.app_metadata as Record<string, string>
  const activeRole = appMeta?.active_role
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const [stats, upcomingMeetings, allActions] = await Promise.all([
    getBoardStats(supabase),
    listMeetings(supabase, { limit: 5, upcoming: true }),
    listActionItems(supabase),
  ])

  const overdueActions = allActions
    .filter((item) => !['completed', 'cancelled'].includes(item.status) && item.due_date < new Date().toISOString().slice(0, 10))
    .slice(0, 5)

  return (
    <div className="max-w-[1200px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-[28px] font-semibold text-navy-950 flex items-center gap-3">
            <Gavel className="h-7 w-7 text-gold" /> Board Management
          </h1>
          <p className="text-[14px] text-navy-mid">Meetings, resolutions, and action tracking</p>
        </div>
        <Link href="/board/meetings/new" className="inline-flex items-center rounded-[6px] bg-gold px-4 py-2 text-[14px] font-medium text-navy-950 hover:bg-gold-hi">
          Schedule Meeting
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ComplianceStatCard icon={Calendar} label="Upcoming Meetings" value={stats.upcomingMeetings} accent="text-blue-600" description="Next 30 days" />
        <ComplianceStatCard icon={CheckSquare} label="Open Action Items" value={stats.openActionItems} accent="text-amber-600" description="Across all meetings" />
        <ComplianceStatCard icon={AlertTriangle} label="Overdue Actions" value={stats.overdueActions} accent="text-err" description="Require immediate attention" />
      </div>

      <div className="mb-8 rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Upcoming Meetings</h2>
          <Link href="/board/meetings" className="text-[13px] text-navy-mid hover:underline">View all meetings</Link>
        </div>
        {upcomingMeetings.length === 0 ? (
          <p className="text-[14px] text-navy-mid">No upcoming meetings scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <Link key={meeting.id} href={`/board/meetings/${meeting.id}`} className="block rounded border border-paper-border p-3 hover:bg-paper">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium text-navy-900">{meeting.title}</div>
                    <div className="text-[13px] text-navy-mid">{new Date(meeting.meeting_date).toLocaleString()}</div>
                  </div>
                  <span className={`inline-block rounded border px-2 py-0.5 text-xs ${MEETING_STATUS_BADGE[meeting.status]}`}>
                    {meeting.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy-900">Overdue Action Items</h2>
          <Link href="/board/actions" className="text-[13px] text-navy-mid hover:underline">View all actions</Link>
        </div>
        {overdueActions.length === 0 ? (
          <p className="text-[14px] text-navy-mid">No overdue action items. Great work!</p>
        ) : (
          <div className="space-y-3">
            {overdueActions.map((item) => (
              <div key={item.id} className="rounded border border-paper-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium text-navy-900">{item.title}</p>
                  <span className={`rounded border px-2 py-0.5 text-xs ${ACTION_STATUS_BADGE[item.status]}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[12px] text-navy-mid">Due: {item.due_date} {item.meeting_title ? `| ${item.meeting_title}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
