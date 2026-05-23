'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createResolution } from '@/lib/board/actions'

interface MemberOption {
  id: string
  name: string
}

export function ResolutionForm({ meetingId, members }: { meetingId: string; members: MemberOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [motionText, setMotionText] = useState('')
  const [proposerId, setProposerId] = useState('')
  const [seconderId, setSeconderId] = useState('')
  const [voteOutcome, setVoteOutcome] = useState<'passed' | 'rejected' | 'tabled'>('passed')
  const [notes, setNotes] = useState('')

  function onSubmit() {
    setError(null)

    startTransition(async () => {
      const result = await createResolution({
        meeting_id: meetingId,
        motion_text: motionText,
        proposer_id: proposerId,
        seconder_id: seconderId || null,
        vote_outcome: voteOutcome,
        notes: notes || null,
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
          <label className="mb-1 block text-[13px] font-medium text-navy-900">Motion text</label>
          <Textarea value={motionText} onChange={(e) => setMotionText(e.target.value)} className="min-h-[120px]" />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy-900">Proposer</label>
          <select className="h-10 w-full rounded border border-paper-border px-3 text-[13px]" value={proposerId} onChange={(e) => setProposerId(e.target.value)}>
            <option value="">Select proposer</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy-900">Seconder</label>
          <select className="h-10 w-full rounded border border-paper-border px-3 text-[13px]" value={seconderId} onChange={(e) => setSeconderId(e.target.value)}>
            <option value="">Optional</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-navy-900">Vote outcome</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(['passed', 'rejected', 'tabled'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`min-h-[80px] rounded border px-3 text-[13px] ${voteOutcome === option ? 'border-navy-900 bg-navy-900 text-white' : 'border-paper-border bg-white text-navy-900'}`}
                onClick={() => setVoteOutcome(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy-900">Notes</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <Button onClick={onSubmit} className="bg-gold text-navy-950 hover:bg-gold-hi" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record Resolution
          </Button>
          <Button variant="outline" onClick={() => router.push(`/board/meetings/${meetingId}`)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
