import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listActionItems } from '@/lib/board/queries'
import { ACTION_STATUS_BADGE } from '@/types/board'

export const dynamic = 'force-dynamic'

const VIEW_ROLES = ['admin', 'ceo', 'board-member', 'board-secretary', 'audit-officer', 'risk-officer']

export default async function BoardActionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRole = (user.app_metadata as Record<string, string>)?.active_role
  if (!activeRole || !VIEW_ROLES.includes(activeRole)) {
    redirect('/dashboard')
  }

  const actions = await listActionItems(supabase)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-heading font-semibold text-navy-950">Board Action Items</h1>
        <p className="text-[14px] text-navy-mid">Cross-meeting action tracker.</p>
      </div>

      <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
        {actions.length === 0 ? (
          <p className="text-[14px] text-navy-mid">No board action items yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-paper-border text-navy-mid">
                  <th className="py-2 pr-3 font-medium">Title</th>
                  <th className="py-2 pr-3 font-medium">Meeting</th>
                  <th className="py-2 pr-3 font-medium">Owner</th>
                  <th className="py-2 pr-3 font-medium">Due</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((item) => (
                  <tr key={item.id} className="border-b border-paper-border/70 last:border-0">
                    <td className="py-3 pr-3 text-navy-900">{item.title}</td>
                    <td className="py-3 pr-3 text-navy-mid">{item.meeting_title ?? '-'}</td>
                    <td className="py-3 pr-3 text-navy-mid">{item.owner_name ?? '-'}</td>
                    <td className="py-3 pr-3 text-navy-900">{item.due_date}</td>
                    <td className="py-3 pr-3">
                      <span className={`rounded border px-2 py-0.5 text-xs ${ACTION_STATUS_BADGE[item.status]}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
