'use client'
// app/(protected)/audit/plans/[id]/PlanStatusForm.tsx
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateAuditPlanStatus } from '@/lib/audit/universe-actions'
import type { AuditPlanStatus } from '@/types/audit-universe'
import { AUDIT_PLAN_STATUS_LABELS } from '@/types/audit-universe'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const TRANSITIONS: Record<AuditPlanStatus, AuditPlanStatus[]> = {
  draft:       ['approved', 'cancelled'],
  approved:    ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
}

interface Props {
  planId:        string
  currentStatus: AuditPlanStatus
}

export function PlanStatusForm({ planId, currentStatus }: Props) {
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const nextStatuses = TRANSITIONS[currentStatus]

  if (nextStatuses.length === 0) {
    return <p className="text-[13px] text-navy-mid">No further transitions available.</p>
  }

  function handleTransition(status: AuditPlanStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updateAuditPlanStatus(planId, { status })
      if ('error' in result) setError(result.error)
    })
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleTransition(s)}
            className="h-9 border-paper-border text-[13px]"
          >
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            → {AUDIT_PLAN_STATUS_LABELS[s]}
          </Button>
        ))}
      </div>
    </div>
  )
}
