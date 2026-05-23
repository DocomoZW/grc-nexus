'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { incidentCloseSchema } from '@/lib/schemas/incidents'
import { closeIncidentCase, updateIncidentStatus } from '@/lib/incidents/actions'
import { INCIDENT_STATUS_LABELS, type IncidentStatus } from '@/types/incidents'

interface StatusUpdateFormProps {
  caseId: string
  currentStatus: IncidentStatus
  canManage: boolean
}

const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  new: ['assigned'],
  assigned: ['in_investigation'],
  in_investigation: ['assigned', 'escalated'],
  escalated: ['in_investigation', 'closed'],
  closed: [],
}

interface StatusFormValues {
  status: IncidentStatus
  notes?: string
  resolution_summary?: string
}

export function StatusUpdateForm({ caseId, currentStatus, canManage }: StatusUpdateFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const allowedNext = useMemo(() => TRANSITIONS[currentStatus], [currentStatus])

  const form = useForm<StatusFormValues>({
    defaultValues: {
      status: allowedNext[0] ?? currentStatus,
      notes: '',
      resolution_summary: '',
    },
    mode: 'onBlur',
  })

  const nextStatus = form.watch('status')
  const requiresClosureSummary = nextStatus === 'closed'

  function onSubmit(values: StatusFormValues) {
    setError(null)

    startTransition(async () => {
      if (values.status === 'closed') {
        const parsed = incidentCloseSchema.safeParse({
          resolution_summary: values.resolution_summary ?? '',
        })

        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Resolution summary is required to close the case.')
          return
        }

        const closeResult = await closeIncidentCase(caseId, parsed.data)
        if ('error' in closeResult) {
          setError(closeResult.error)
          return
        }
      } else {
        const updateResult = await updateIncidentStatus(caseId, values.status, values.notes)
        if ('error' in updateResult) {
          setError(updateResult.error)
          return
        }
      }

      router.refresh()
    })
  }

  if (!canManage) {
    return <p className="text-[14px] text-navy-mid">You do not have permission to update this incident status.</p>
  }

  if (allowedNext.length === 0) {
    return <p className="text-[14px] text-navy-mid">This case is closed and cannot be transitioned further.</p>
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
                <Select value={field.value} onValueChange={(value) => field.onChange(value as IncidentStatus)}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allowedNext.map((status) => (
                      <SelectItem key={status} value={status}>
                        {INCIDENT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Update Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[90px] resize-y border-paper-border"
                    placeholder="Add context for this status update"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {requiresClosureSummary && (
            <FormField
              control={form.control}
              name="resolution_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[14px] font-medium text-navy-900">
                    Resolution Summary <span className="text-err">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[120px] resize-y border-paper-border"
                      placeholder="Describe the remediation outcome and evidence basis."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            className="h-11 bg-gold px-8 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Case Status
          </Button>
        </form>
      </Form>
    </div>
  )
}
