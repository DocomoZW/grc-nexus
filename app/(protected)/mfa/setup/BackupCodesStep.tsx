'use client'
// app/(protected)/mfa/setup/BackupCodesStep.tsx
// Reusable backup codes display component.
// Shows 8 codes in 2x4 grid, download (.txt) and copy buttons.
// Per UI-SPEC Screen 6 Step 3.
import { useState } from 'react'
import { Download, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface BackupCodesStepProps {
  codes: string[]
  onComplete: () => void
  isCompleting?: boolean
}

export function BackupCodesStep({ codes, onComplete, isCompleting }: BackupCodesStepProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleDownload() {
    const text = [
      'GRC-Nexus Backup Recovery Codes',
      '================================',
      'These codes are single-use. Store them securely.',
      '',
      ...codes,
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'grc-nexus-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded.')
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    toast.success('Backup codes copied to clipboard.')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div>
      <h3 className="text-[18px] font-semibold text-navy-900 font-body mb-2">
        Save your backup codes
      </h3>
      <p className="text-[14px] text-navy-mid font-body mb-4">
        If you lose access to your authenticator, you can use these codes to sign in.
        Each code can only be used once.
      </p>

      {/* Warning */}
      <Alert className="mb-4 border-gold/40 bg-gold-pale">
        <AlertDescription className="text-[13px] text-navy-900 font-medium">
          These codes will not be shown again. Save them somewhere secure before continuing.
        </AlertDescription>
      </Alert>

      {/* Codes grid */}
      <div className="bg-paper rounded-[8px] border border-paper-border p-4 mb-4">
        <div className="grid grid-cols-2 gap-2">
          {codes.map((code, i) => (
            <code
              key={i}
              className="font-mono text-[15px] font-semibold text-navy-900 bg-white rounded border border-paper-border px-3 py-2 text-center tracking-wider"
            >
              {code}
            </code>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-9 text-[13px] border-paper-border"
          onClick={handleDownload}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download .txt
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-9 text-[13px] border-paper-border"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 mr-1.5" />
          )}
          {copied ? 'Copied!' : 'Copy codes'}
        </Button>
      </div>

      {/* Confirmation checkbox */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-paper rounded-[8px] border border-paper-border">
        <Checkbox
          id="codes-confirmed"
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(!!v)}
        />
        <label
          htmlFor="codes-confirmed"
          className="text-[13px] text-navy-900 font-body cursor-pointer select-none"
        >
          I have saved my backup codes in a secure location
        </label>
      </div>

      {/* Complete setup button */}
      <Button
        type="button"
        className="w-full h-11 bg-gold text-navy-950 hover:bg-gold-hi text-[15px] font-semibold"
        disabled={!confirmed || isCompleting}
        onClick={onComplete}
      >
        {isCompleting ? 'Completing...' : 'Complete setup'}
      </Button>
    </div>
  )
}
