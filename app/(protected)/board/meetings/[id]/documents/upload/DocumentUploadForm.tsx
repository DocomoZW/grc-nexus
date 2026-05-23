'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadDocument } from '@/lib/board/actions'

async function computeSha256Hex(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function DocumentUploadForm({ meetingId }: { meetingId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit() {
    if (!file) {
      setError('Please select a document.')
      return
    }

    startTransition(async () => {
      setError(null)

      try {
        const hash = await computeSha256Hex(file)
        const formData = new FormData()
        formData.set('meeting_id', meetingId)
        formData.set('file', file)
        formData.set('sha256_hash', hash)

        const result = await uploadDocument(formData)
        if ('error' in result) {
          setError(result.error)
          return
        }

        router.push(`/board/meetings/${meetingId}`)
        router.refresh()
      } catch {
        setError('Upload failed. Please try again.')
      }
    })
  }

  return (
    <div className="rounded-[10px] border border-paper-border bg-white p-6 shadow-card">
      {error && <p className="mb-3 text-[13px] text-red-600">{error}</p>}

      <label className="mb-4 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded border border-dashed border-paper-border bg-paper text-center text-[13px] text-navy-mid">
        <UploadCloud className="mb-2 h-5 w-5" />
        <span>{file ? file.name : 'Drop a board pack or click to choose file'}</span>
        <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      <div className="flex gap-2">
        <Button onClick={onSubmit} className="bg-gold text-navy-950 hover:bg-gold-hi" disabled={isPending || !file}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upload
        </Button>
        <Button variant="outline" onClick={() => router.push(`/board/meetings/${meetingId}`)} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
