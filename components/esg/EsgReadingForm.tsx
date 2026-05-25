'use client'
// components/esg/EsgReadingForm.tsx
// Phase 12 — Record an ESG reading.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEsgReading } from '@/lib/esg/actions'
import type { EsgReadingInput } from '@/lib/schemas/esg'

interface Props {
  metricId: string
}

export function EsgReadingForm({ metricId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    const form = e.currentTarget

    startTransition(async () => {
      const values: EsgReadingInput = {
        period_label: fd.get('period_label') as string,
        actual_value: fd.get('actual_value') as unknown as number,
        notes:        (fd.get('notes') as string | undefined) ?? null,
        evidence_url: (fd.get('evidence_url') as string | undefined) ?? null,
      }
      const result = await createEsgReading(metricId, values)
      if ('error' in result) {
        setServerError(result.error)
      } else {
        setSuccess(true)
        form.reset()
        router.refresh()
      }
    })
  }

  const inputCls = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-60'
  const labelCls = 'block text-sm font-medium text-gray-700'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Reading recorded successfully.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="period_label">Period *</label>
          <input required id="period_label" name="period_label" placeholder="e.g. Q1 2026" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="actual_value">Actual Value *</label>
          <input required id="actual_value" name="actual_value" type="number" step="any" placeholder="0" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="evidence_url">Evidence URL</label>
        <input id="evidence_url" name="evidence_url" type="url" placeholder="https://…" className={inputCls} />
      </div>

      <div>
        <label className={labelCls} htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} placeholder="Optional notes…" className={inputCls} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
      >
        {isPending ? 'Saving…' : 'Record Reading'}
      </button>
    </form>
  )
}
