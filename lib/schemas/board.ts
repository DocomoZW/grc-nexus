import { z } from 'zod'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'image/jpeg',
  'image/png',
] as const

const MAX_FILE_BYTES = 25 * 1024 * 1024

export const meetingSchema = z.object({
  title: z.string().trim().min(3).max(200),
  meeting_date: z.coerce.date(),
  location: z.string().trim().max(200).optional().nullable(),
  agenda_items: z.array(z.string().trim().min(1)).min(1),
  attendee_ids: z.array(z.string().uuid()).default([]),
})

export const resolutionSchema = z.object({
  meeting_id: z.string().uuid(),
  motion_text: z.string().trim().min(3),
  proposer_id: z.string().uuid(),
  seconder_id: z.string().uuid().optional().nullable(),
  vote_outcome: z.enum(['passed', 'rejected', 'tabled']),
  notes: z.string().trim().max(2000).optional().nullable(),
})

export const actionItemSchema = z.object({
  meeting_id: z.string().uuid(),
  resolution_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  due_date: z.coerce.date(),
  status: z.enum(['open', 'in_progress', 'completed', 'overdue', 'cancelled']).default('open'),
})

export const documentUploadSchema = z.object({
  meeting_id: z.string().uuid(),
  file: z.instanceof(File),
  sha256_hash: z.string().length(64),
}).superRefine((input, ctx) => {
  if (input.file.size > MAX_FILE_BYTES) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'File size exceeds the 25 MB limit.',
      path: ['file'],
    })
  }

  if (!ALLOWED_MIME_TYPES.includes(input.file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'File type not accepted. Accepted types: PDF, DOCX, XLSX, JPG, PNG.',
      path: ['file'],
    })
  }
})

export type MeetingInput = z.infer<typeof meetingSchema>
export type ResolutionInput = z.infer<typeof resolutionSchema>
export type ActionItemInput = z.infer<typeof actionItemSchema>
