'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { auditFindingStatusSchema, type AuditFindingStatusInput } from '@/lib/schemas/audit-findings'
import { updateAuditFindingStatus } from '@/lib/audit/actions'
import { AUDIT_FINDING_STATUS_LABELS, type AuditFindingStatus } from '@/types/audit'

interface StatusUpdateFormProps {
  findingId: string
  currentStatus: AuditFindingStatus
  canManage: boolean
}

const TRANSITIONS: Record<AuditFindingStatus, AuditFindingStatus[]> = {
  open: ['in_progress'],
  in_progress: ['open', 'closed'],
  closed: [],
}

export function StatusUpdateForm({ findingId, currentStatus, canManage }: StatusUpdateFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allowedNext = TRANSITIONS[currentStatus]

  const form = useForm<AuditFindingStatusInput>({
    resolver: zodResolver(auditFindingStatusSchema),
    defaultValues: {
      status: currentStatus,
      notes: '',
    },
  })

  function onSubmit(values: AuditFindingStatusInput) {
    setError(null)
    startTransition(async () => {
      const result = await updateAuditFindingStatus(findingId, values)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  if (!canManage) {
    return <p className="text-[14px] text-navy-mid">You do not have permission to update this finding status.</p>
  }

  if (allowedNext.length === 0) {
    return <p className="text-[14px] text-navy-mid">This finding is closed and cannot be transitioned.</p>
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Next Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allowedNext.map((status) => (
                      <SelectItem key={status} value={status}>
                        {AUDIT_FINDING_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="h-11 bg-gold px-8 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Status
          </Button>
        </form>
      </Form>
    </div>
  )
}
