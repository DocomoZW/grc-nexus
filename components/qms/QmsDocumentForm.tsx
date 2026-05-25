'use client'
// components/qms/QmsDocumentForm.tsx
// Phase 13 — Create QMS document form.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQmsDocument } from '@/lib/qms/actions'

const DOC_TYPES = [
  { value: 'procedure',        label: 'Procedure' },
  { value: 'policy',           label: 'Policy' },
  { value: 'work_instruction', label: 'Work Instruction' },
  { value: 'form',             label: 'Form' },
  { value: 'record',           label: 'Record' },
  { value: 'manual',           label: 'Manual' },
] as const

export function QmsDocumentForm() {
  const router  = useRouter()
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const fd = new FormData(e.currentTarget)
    const raw = {
      doc_code:      String(fd.get('doc_code') ?? ''),
      title:         String(fd.get('title')    ?? ''),
      doc_type:      String(fd.get('doc_type') ?? ''),
      review_due_at: String(fd.get('review_due_at') ?? ''),
      file_url:      String(fd.get('file_url') ?? ''),
    }

    const result = await createQmsDocument(
      raw as unknown as Parameters<typeof createQmsDocument>[0],
    )
    setSaving(false)

    if ('error' in result) { setError(result.error); return }
    router.push('/qms')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Code *</label>
          <input name="doc_code" required placeholder="e.g. QP-001"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
          <select name="doc_type" required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
            <option value="">Select type…</option>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input name="title" required placeholder="Document title"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Review Due Date</label>
        <input name="review_due_at" type="date"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
        <input name="file_url" type="url" placeholder="https://…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
        <p className="text-xs text-gray-400 mt-1">Link to document stored in SharePoint / Drive.</p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : 'Register Document'}
        </button>
      </div>
    </form>
  )
}
