'use client'
// app/(protected)/audit/plans/new/PlanForm.tsx — Client Component
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { auditPlanSchema, type AuditPlanInput } from '@/lib/schemas/audit-universe'
import { createAuditPlan } from '@/lib/audit/universe-actions'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'

export function PlanForm() {
  const router = useRouter()
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<AuditPlanInput>({
    resolver: zodResolver(auditPlanSchema),
    defaultValues: {
      title:       '',
      description: '',
      plan_year:   new Date().getFullYear(),
    },
    mode: 'onBlur',
  })

  function onSubmit(values: AuditPlanInput) {
    setError(null)
    startTransition(async () => {
      const result = await createAuditPlan(values)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.push(`/audit/plans/${result.data.id}`)
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
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[14px] font-medium text-navy-900">Plan Title <span className="text-err">*</span></FormLabel>
              <FormControl>
                <Input type="text" placeholder="e.g. Annual Internal Audit Plan 2026" className="h-11 border-paper-border" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="plan_year" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Plan Year <span className="text-err">*</span></FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  className="h-11 border-paper-border"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Description <span className="text-navy-mid font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the scope and objectives of this plan..."
                  className="border-paper-border resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button
            type="submit"
            disabled={isPending}
            className="mt-6 h-11 bg-gold px-8 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Plan
          </Button>
        </form>
      </Form>
    </div>
  )
}
