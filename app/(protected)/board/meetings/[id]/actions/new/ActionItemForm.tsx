'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createActionItem } from '@/lib/board/actions'

interface MemberOption {
  id: string
  name: string
}

export function ActionItemForm({ meetingId, members }: { meetingId: string; members: MemberOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [dueDate, setDueDate] = useState('')

  function onSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createActionItem({
        meeting_id: meetingId,
        resolution_id: null,
        title,
        description: description || null,
        owner_id: ownerId || null,
        due_date: new Date(dueDate),
        status: 'open',
      })

      if ('error' in result) {
        setError(result.error)
        return
      }

      router.push(`/board/meetings/${meetingId}`)
      router.refresh()
    })
  }

  return (
    <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
      {error && <p className="mb-3 text-[13px] text-red-600">{error}</p>}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy-900">Action title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy-900">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[100px]" />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy-900">Owner</label>
          <select className="h-10 w-full rounded border border-paper-border px-3 text-[13px]" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy-900">Due date</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <Button onClick={onSubmit} className="bg-gold text-navy-950 hover:bg-gold-hi" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Action
          </Button>
          <Button variant="outline" onClick={() => router.push(`/board/meetings/${meetingId}`)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
