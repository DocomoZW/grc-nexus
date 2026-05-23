'use client'

import { useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ExportGovernanceReportButtonProps {
  enabled: boolean
}

export function ExportGovernanceReportButton({ enabled }: ExportGovernanceReportButtonProps) {
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => searchParams.toString(), [searchParams])

  function triggerDownload() {
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch(`/api/reports/governance${query ? `?${query}` : ''}`, {
          method: 'GET',
        })

        if (response.status === 403) {
          setError('Your role is not permitted to export governance reports.')
          return
        }

        if (!response.ok) {
          setError('Report export failed. Please try again.')
          return
        }

        const blob = await response.blob()
        const disposition = response.headers.get('content-disposition') ?? ''
        const filenameMatch = disposition.match(/filename="([^"]+)"/)
        const filename = filenameMatch?.[1] ?? `governance-summary-${Date.now()}.pdf`

        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
      } catch {
        setError('Unexpected error while generating report.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        className="h-9 bg-white text-navy-900 border border-paper-border hover:border-navy-mid/40"
        disabled={!enabled || isPending}
        onClick={triggerDownload}
      >
        {isPending ? 'Generating PDF...' : 'Download Governance PDF'}
      </Button>
      {!enabled && (
        <p className="text-[12px] text-navy-mid">Only admin, CEO, and audit-officer can export.</p>
      )}
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  )
}
