'use client'
// components/qms/NcStatusForm.tsx
// Phase 13 — Update NC status + root cause + corrective action.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateNcStatus } from '@/lib/qms/actions'
import type { NcStatus } from '@/types/qms'
import { NC_STATUS_LABELS } from '@/types/qms'

const STATUS_TRANSITIONS: Record<NcStatus, NcStatus[]> = {
  open:                ['root_cause_analysis', 'closed'],
  root_cause_analysis: ['corrective_action', 'closed'],
  corrective_action:   ['verification', 'closed'],
  verification:        ['closed', 'corrective_action'],
  closed:              [],
}

interface Props {
  ncId: string
  currentStatus: NcStatus
}

export function NcStatusForm({ ncId, currentStatus }: Props) {
  const router    = useRouter()
  const next      = STATUS_TRANSITIONS[currentStatus] ?? []
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (next.length === 0) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const fd = new FormData(e.currentTarget)
    const raw = {
      status:            String(fd.get('status')            ?? ''),
      root_cause:        String(fd.get('root_cause')        ?? ''),
      corrective_action: String(fd.get('corrective_action') ?? ''),
    }

    const result = await updateNcStatus(
      ncId,
      raw as unknown as Parameters<typeof updateNcStatus>[1],
    )
    setSaving(false)

    if ('error' in result) { setError(result.error); return }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Status *</label>
        <select name="status" required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
          <option value="">Select…</option>
          {next.map(s => (
            <option key={s} value={s}>{NC_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause</label>
        <textarea name="root_cause" rows={3} placeholder="Describe the root cause…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Action</label>
        <textarea name="corrective_action" rows={3} placeholder="Describe the corrective action taken…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none" />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : 'Update Status'}
        </button>
      </div>
    </form>
  )
}
