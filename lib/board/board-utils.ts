import type { ActionItemStatus, MeetingStatus, ResolutionOutcome } from '@/types/board'

export const MEETING_STATUS_BADGE: Record<MeetingStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
}

export const RESOLUTION_OUTCOME_BADGE: Record<ResolutionOutcome, string> = {
  passed: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  tabled: 'bg-zinc-100 text-zinc-700 border-zinc-200',
}

export const ACTION_STATUS_BADGE: Record<ActionItemStatus, string> = {
  open: 'bg-slate-100 text-slate-800 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-zinc-100 text-zinc-700 border-zinc-200',
}

export function isMeetingClosed(status: MeetingStatus): boolean {
  return status === 'closed'
}

export function getEscalationThreshold(dueDate: string): 'none' | 'early_warning' | 'due_today' | 'critical_overdue' {
  const due = new Date(`${dueDate}T00:00:00.000Z`)
  const today = new Date()
  const now = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays >= 1 && diffDays <= 3) return 'early_warning'
  if (diffDays === 0) return 'due_today'
  if (diffDays <= -7) return 'critical_overdue'
  return 'none'
}

export function buildBoardPackStoragePath(
  institutionId: string,
  meetingId: string,
  epochMs: number,
  sha256Hash: string,
  extension: string,
): string {
  const cleanExt = extension.replace('.', '').toLowerCase() || 'bin'
  return `${institutionId}/${meetingId}/${epochMs}_${sha256Hash.slice(0, 16)}.${cleanExt}`
}

export function computeBoardActionStats(items: Array<{ due_date: string; status: ActionItemStatus }>) {
  const today = new Date().toISOString().slice(0, 10)
  const open = items.filter((item) => !['completed', 'cancelled'].includes(item.status)).length
  const overdue = items.filter(
    (item) => !['completed', 'cancelled'].includes(item.status) && item.due_date < today,
  ).length
  return { open, overdue }
}
