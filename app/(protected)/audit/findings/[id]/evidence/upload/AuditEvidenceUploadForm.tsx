'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileCheck, Loader2, Upload, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { auditFindingEvidenceSchema, type AuditFindingEvidenceInput } from '@/lib/schemas/audit-findings'
import { uploadAuditFindingEvidence } from '@/lib/audit/actions'
import { AUDIT_FINDING_SEVERITY_LABELS, type AuditFindingSeverity } from '@/types/audit'

async function computeSHA256Browser(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'image/jpeg',
  'image/png',
]

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

interface AuditEvidenceUploadFormProps {
  findingId: string
  findingTitle: string
  findingSeverity: AuditFindingSeverity
}

export function AuditEvidenceUploadForm({
  findingId,
  findingTitle,
  findingSeverity,
}: AuditEvidenceUploadFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [computedHash, setComputedHash] = useState('')
  const [isHashing, setIsHashing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<AuditFindingEvidenceInput>({
    resolver: zodResolver(auditFindingEvidenceSchema),
    defaultValues: {
      finding_id: findingId,
      sha256_hash: '',
      mime_type: 'application/pdf',
      file_size_bytes: 0,
    },
  })

  async function handleFileSelected(file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('File type not accepted. Accepted types: PDF, DOCX, XLSX, JPG, PNG.')
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25 MB limit. Please use a smaller file.')
      return
    }

    setError(null)
    setSelectedFile(file)
    setIsHashing(true)

    try {
      const hash = await computeSHA256Browser(file)
      setComputedHash(hash)
      form.setValue('finding_id', findingId)
      form.setValue('sha256_hash', hash)
      form.setValue('mime_type', file.type as AuditFindingEvidenceInput['mime_type'])
      form.setValue('file_size_bytes', file.size)
    } catch {
      setError('Checksum computation failed. Please try again.')
    } finally {
      setIsHashing(false)
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null)
    setComputedHash('')
    setError(null)
    form.reset({ finding_id: findingId, sha256_hash: '', mime_type: 'application/pdf', file_size_bytes: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function onSubmit() {
    if (!selectedFile || computedHash.length !== 64 || isHashing) return

    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('finding_id', findingId)
      fd.append('sha256_hash', computedHash)

      const result = await uploadAuditFindingEvidence(fd)
      if ('error' in result) {
        setError(result.error)
        return
      }

      router.push(`/audit/findings/${findingId}`)
    })
  }

  const submitDisabled = !selectedFile || computedHash.length !== 64 || isHashing || isPending

  return (
    <div>
      <div className="mt-[8px] rounded-grc-sm border border-paper-border bg-gold-pale/30 p-[8px]">
        <p className="text-[14px] font-semibold text-navy-900">{findingTitle}</p>
        <p className="mt-[4px] text-[14px] text-navy-mid">Severity: {AUDIT_FINDING_SEVERITY_LABELS[findingSeverity]}</p>
      </div>

      <div className="mt-6 rounded-[10px] border border-paper-border bg-white p-8 shadow-card">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!selectedFile) fileInputRef.current?.click()
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !selectedFile) {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) void handleFileSelected(file)
              }}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                'flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-grc-md border-2 border-dashed px-[24px] py-[32px] transition-all',
                selectedFile ? 'border-ok/50 bg-ok/5' : 'border-paper-border bg-paper/50',
              )}
            >
              {!selectedFile ? (
                <>
                  <Upload className="h-8 w-8 text-paper-border" aria-hidden="true" />
                  <p className="mt-3 text-[16px] text-navy-mid">Drop evidence file here or click to browse</p>
                </>
              ) : (
                <>
                  <FileCheck className="h-8 w-8 text-ok" aria-hidden="true" />
                  <p className="mt-3 text-[14px] font-medium text-navy-900">{selectedFile.name}</p>
                  <p className="mt-1 text-[14px] text-navy-mid">{formatFileSize(selectedFile.size)} · {selectedFile.type}</p>
                  {isHashing ? (
                    <p className="mt-[4px] text-[14px] text-navy-mid">
                      <Loader2 className="mr-[4px] inline h-[12px] w-[12px] animate-spin" aria-hidden="true" />
                      Computing checksum...
                    </p>
                  ) : (
                    <code className="mt-[4px] break-all font-mono text-[13px] text-navy-mid">{computedHash}</code>
                  )}
                  <button type="button" onClick={handleRemoveFile} className="mt-[8px] text-[14px] text-err hover:underline">
                    <XCircle className="mr-1 inline h-4 w-4" />
                    Remove file
                  </button>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFileSelected(file)
              }}
            />

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 border-paper-border text-[14px]"
                onClick={() => router.push(`/audit/findings/${findingId}`)}
                disabled={isPending}
              >
                Back to Finding
              </Button>
              <Button type="submit" className="h-11 bg-gold px-8 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi" disabled={submitDisabled}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Evidence
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
