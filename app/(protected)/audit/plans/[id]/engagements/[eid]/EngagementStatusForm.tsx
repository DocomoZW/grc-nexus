'use client'
// app/(protected)/audit/plans/[id]/engagements/[eid]/EngagementStatusForm.tsx
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateAuditEngagementStatus } from '@/lib/audit/universe-actions'
import { auditEngagementStatusSchema, type AuditEngagementStatusInput } from '@/lib/schemas/audit-universe'
import type { AuditEngagementStatus } from '@/types/audit-universe'
import { AUDIT_ENGAGEMENT_STATUS_LABELS } from '@/types/audit-universe'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

const ALL_STATUSES: AuditEngagementStatus[] = ['planned', 'fieldwork', 'reporting', 'completed', 'cancelled']

interface Props {
  engagementId:  string
  currentStatus: AuditEngagementStatus
}

export function EngagementStatusForm({ engagementId, currentStatus }: Props) {
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)

  const form = useForm<AuditEngagementStatusInput>({
    resolver: zodResolver(auditEngagementStatusSchema),
    defaultValues: {
      status:       currentStatus,
      opinion:      '',
      actual_start: today,
      actual_end:   '',
    },
    mode: 'onBlur',
  })

  function onSubmit(values: AuditEngagementStatusInput) {
    setError(null)
    startTransition(async () => {
      const result = await updateAuditEngagementStatus(engagementId, values)
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-3">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] font-medium text-navy-900">Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-10 border-paper-border text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-[13px]">
                      {AUDIT_ENGAGEMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="actual_start" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-medium text-navy-900">Actual Start</FormLabel>
                <FormControl>
                  <Input type="date" className="h-10 border-paper-border" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="actual_end" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-medium text-navy-900">Actual End</FormLabel>
                <FormControl>
                  <Input type="date" className="h-10 border-paper-border" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="opinion" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] font-medium text-navy-900">Audit Opinion</FormLabel>
              <FormControl>
                <Input type="text" placeholder="e.g. Satisfactory" className="h-10 border-paper-border" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button
            type="submit"
            disabled={isPending}
            className="h-9 w-full bg-gold text-[13px] font-semibold text-navy-950 hover:bg-gold-hi"
          >
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Update Status
          </Button>
        </form>
      </Form>
    </div>
  )
}
