export type MeetingStatus = 'scheduled' | 'in_progress' | 'closed'
export type ResolutionOutcome = 'passed' | 'rejected' | 'tabled'
export type ActionItemStatus = 'open' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  closed: 'Closed',
}

export const RESOLUTION_OUTCOME_LABELS: Record<ResolutionOutcome, string> = {
  passed: 'Passed',
  rejected: 'Rejected',
  tabled: 'Tabled',
}

export const ACTION_STATUS_LABELS: Record<ActionItemStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export const MEETING_STATUS_BADGE: Record<MeetingStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
}

export const RESOLUTION_OUTCOME_BADGE: Record<ResolutionOutcome, string> = {
  passed: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  tabled: 'bg-slate-100 text-slate-800 border-slate-200',
}

export const ACTION_STATUS_BADGE: Record<ActionItemStatus, string> = {
  open: 'bg-slate-100 text-slate-800 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-zinc-100 text-zinc-700 border-zinc-200',
}

export interface BoardMeetingRow {
  id: string
  title: string
  meeting_date: string
  location: string | null
  status: MeetingStatus
  agenda_items: string[]
  attendee_ids: string[]
  created_by: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface BoardDocumentRow {
  id: string
  meeting_id: string
  storage_path: string
  original_filename: string
  mime_type: string
  file_size_bytes: number
  sha256_hash: string
  uploaded_by: string | null
  uploaded_at: string
  uploader_name?: string | null
}

export interface BoardResolutionRow {
  id: string
  meeting_id: string
  resolution_number: number
  motion_text: string
  proposer_id: string
  seconder_id: string | null
  vote_outcome: ResolutionOutcome
  notes: string | null
  created_by: string | null
  created_at: string
  proposer_name?: string | null
  seconder_name?: string | null
}

export interface BoardActionItemRow {
  id: string
  meeting_id: string
  resolution_id: string | null
  title: string
  description: string | null
  owner_id: string | null
  due_date: string
  status: ActionItemStatus
  created_by: string | null
  created_at: string
  updated_at: string
  owner_name?: string | null
  meeting_title?: string | null
}
