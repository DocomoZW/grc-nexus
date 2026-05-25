'use client'
// components/esg/EsgMetricForm.tsx
// Phase 12 — Create ESG metric form.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEsgMetric } from '@/lib/esg/actions'
import { ESG_CATEGORIES } from '@/types/esg'
import type { EsgFramework } from '@/types/esg'

interface Props {
  frameworks: EsgFramework[]
}

export function EsgMetricForm({ frameworks }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const raw = {
        framework_id:  fd.get('framework_id') as string | undefined,
        metric_code:   fd.get('metric_code') as string,
        name:          fd.get('name') as string,
        category:      fd.get('category') as string,
        unit:          fd.get('unit') as string,
        target_value:  fd.get('target_value') as unknown as string,
        description:   fd.get('description') as string | undefined,
      }
      const result = await createEsgMetric(raw as unknown as Parameters<typeof createEsgMetric>[0])

      if ('error' in result) {
        setServerError(result.error)
      } else {
        router.push('/esg')
        router.refresh()
      }
    })
  }

  const inputCls = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-60'
  const labelCls = 'block text-sm font-medium text-gray-700'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="metric_code">Metric Code *</label>
          <input required id="metric_code" name="metric_code" placeholder="e.g. ENV-001" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="category">Category *</label>
          <select required id="category" name="category" className={inputCls}>
            <option value="">Select category…</option>
            {ESG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="name">Name *</label>
        <input required id="name" name="name" placeholder="e.g. Total GHG Emissions" className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="unit">Unit *</label>
          <input required id="unit" name="unit" placeholder="e.g. tCO2e, %, count" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="target_value">Target Value</label>
          <input id="target_value" name="target_value" type="number" step="any" placeholder="Optional" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="framework_id">ESG Framework</label>
        <select id="framework_id" name="framework_id" className={inputCls}>
          <option value="">None</option>
          {frameworks.map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} placeholder="Optional description…" className={inputCls} />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Saving…' : 'Create Metric'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
