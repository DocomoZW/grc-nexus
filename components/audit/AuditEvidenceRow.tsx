import { FileText, FileImage, FileSpreadsheet, CheckCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface AuditEvidenceRowProps {
  originalFilename: string
  fileSizeBytes: number
  mimeType: string
  sha256Hash: string
  uploadedAt: string
  uploadedByName: string
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    return <FileImage className="mt-[2px] h-5 w-5 flex-shrink-0 text-navy-mid" aria-hidden="true" />
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return <FileSpreadsheet className="mt-[2px] h-5 w-5 flex-shrink-0 text-navy-mid" aria-hidden="true" />
  }
  return <FileText className="mt-[2px] h-5 w-5 flex-shrink-0 text-navy-mid" aria-hidden="true" />
}

export function AuditEvidenceRow({
  originalFilename,
  fileSizeBytes,
  mimeType,
  sha256Hash,
  uploadedAt,
  uploadedByName,
}: AuditEvidenceRowProps) {
  const hashPreview = `${sha256Hash.slice(0, 16)}...`

  return (
    <TooltipProvider>
      <div className="rounded-grc-sm border border-paper-border bg-white p-[8px]">
        <div className="flex items-start gap-[12px]">
          {getFileIcon(mimeType)}
          <div className="flex-1 min-w-0">
            <p className="truncate text-[14px] font-medium text-navy-900" title={originalFilename}>
              {originalFilename}
            </p>
            <p className="mt-[4px] font-mono text-[14px] text-navy-mid">
              {formatFileSize(fileSizeBytes)} · Uploaded {formatDate(uploadedAt)} by {uploadedByName}
            </p>
            <div className="mt-[8px] flex items-center gap-[8px]">
              <CheckCircle className="h-[14px] w-[14px] flex-shrink-0 text-ok" aria-label="Integrity status: Verified" />
              <span className="text-[14px] text-ok">Verified</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <code className="cursor-default font-mono text-[14px] text-navy-mid">{hashPreview}</code>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[500px]">
                  <p className="break-all font-mono text-[12px]">{sha256Hash}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
