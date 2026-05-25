'use client'
// app/(protected)/audit/plans/[id]/engagements/[eid]/ProcedureResultForm.tsx
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateTestProcedureResult } from '@/lib/audit/universe-actions'
import type { AuditProcedureResult } from '@/types/audit-universe'
import { AUDIT_PROCEDURE_RESULT_LABELS } from '@/types/audit-universe'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

const RESULTS: AuditProcedureResult[] = ['not_started', 'pass', 'fail', 'exception', 'not_applicable']

interface Props {
  procedureId:   string
  currentResult: AuditProcedureResult
  engagementId:  string
  planId:        string
}

export function ProcedureResultForm({ procedureId, currentResult }: Props) {
  const [result, setResult]          = useState<AuditProcedureResult>(currentResult)
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await updateTestProcedureResult(procedureId, { result })
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="w-full mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Select value={result} onValueChange={(v) => setResult(v as AuditProcedureResult)}>
        <SelectTrigger className="h-8 w-[160px] border-paper-border text-[12px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESULTS.map((r) => (
            <SelectItem key={r} value={r} className="text-[12px]">
              {AUDIT_PROCEDURE_RESULT_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending || result === currentResult}
        onClick={handleSave}
        className="h-8 border-paper-border text-[12px]"
      >
        {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        Save
      </Button>
    </div>
  )
}
