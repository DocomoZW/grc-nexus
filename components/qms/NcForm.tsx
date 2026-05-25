'use client'
// components/qms/NcForm.tsx
// Phase 13 — Log non-conformance form.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNonConformance } from '@/lib/qms/actions'

const SOURCES = [
  { value: 'internal_audit',      label: 'Internal Audit' },
  { value: 'external_audit',      label: 'External Audit' },
  { value: 'customer_complaint',  label: 'Customer Complaint' },
  { value: 'process_observation', label: 'Process Observation' },
  { value: 'supplier',            label: 'Supplier' },
  { value: 'other',               label: 'Other' },
] as const

const SEVERITIES = [
  { value: 'minor',    label: 'Minor' },
  { value: 'major',    label: 'Major' },
  { value: 'critical', label: 'Critical' },
] as const

export function NcForm() {
  const router  = useRouter()
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const fd = new FormData(e.currentTarget)
    const raw = {
      nc_number:   String(fd.get('nc_number')   ?? ''),
      title:       String(fd.get('title')        ?? ''),
      description: String(fd.get('description') ?? ''),
      source:      String(fd.get('source')       ?? ''),
      severity:    String(fd.get('severity')     ?? ''),
      due_date:    String(fd.get('due_date')     ?? ''),
    }

    const result = await createNonConformance(
      raw as unknown as Parameters<typeof createNonConformance>[0],
    )
    setSaving(false)

    if ('error' in result) { setError(result.error); return }
    router.push('/qms/nc')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NC Number *</label>
          <input name="nc_number" required placeholder="e.g. NC-2026-001"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
          <select name="severity" required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
            <option value="">Select…</option>
            {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input name="title" required placeholder="Brief description of the non-conformance"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea name="description" required rows={4} placeholder="Detailed description of the non-conformance…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
          <select name="source" required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
            <option value="">Select source…</option>
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input name="due_date" type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : 'Log Non-Conformance'}
        </button>
      </div>
    </form>
  )
}
