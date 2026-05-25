'use client'
// app/(protected)/audit/plans/[id]/engagements/new/EngagementForm.tsx
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { auditEngagementSchema, type AuditEngagementInput } from '@/lib/schemas/audit-universe'
import { createAuditEngagement } from '@/lib/audit/universe-actions'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  planId: string
}

export function EngagementForm({ planId }: Props) {
  const router = useRouter()
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().slice(0, 10)

  const form = useForm<AuditEngagementInput>({
    resolver: zodResolver(auditEngagementSchema),
    defaultValues: {
      title:          '',
      description:    '',
      auditee_dept:   '',
      lead_auditor_id:'',
      planned_start:  today,
      planned_end:    today,
    },
    mode: 'onBlur',
  })

  function onSubmit(values: AuditEngagementInput) {
    setError(null)
    startTransition(async () => {
      const result = await createAuditEngagement(planId, values)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.push(`/audit/plans/${planId}/engagements/${result.data.id}`)
      }
    })
  }

  return (
    <div className="rounded-[10px] border border-paper-border bg-white p-8 shadow-card">
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[14px] font-medium text-navy-900">Title <span className="text-err">*</span></FormLabel>
              <FormControl>
                <Input type="text" placeholder="e.g. Treasury Operations Review" className="h-11 border-paper-border" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="auditee_dept" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[14px] font-medium text-navy-900">Auditee Department</FormLabel>
              <FormControl>
                <Input type="text" placeholder="e.g. Finance" className="h-11 border-paper-border" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="planned_start" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Start Date <span className="text-err">*</span></FormLabel>
                <FormControl>
                  <Input type="date" className="h-11 border-paper-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="planned_end" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">End Date <span className="text-err">*</span></FormLabel>
                <FormControl>
                  <Input type="date" className="h-11 border-paper-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="lead_auditor_id" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[14px] font-medium text-navy-900">Lead Auditor ID <span className="text-navy-mid font-normal">(UUID, optional)</span></FormLabel>
              <FormControl>
                <Input type="text" placeholder="User UUID" className="h-11 border-paper-border font-mono" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[14px] font-medium text-navy-900">Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Engagement scope and objectives..." className="border-paper-border resize-none" rows={3} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full bg-gold text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Engagement
          </Button>
        </form>
      </Form>
    </div>
  )
}
