'use client'
// app/(protected)/audit/plans/[id]/engagements/[eid]/AddProcedureForm.tsx
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { auditTestProcedureSchema, type AuditTestProcedureInput } from '@/lib/schemas/audit-universe'
import { createAuditTestProcedure } from '@/lib/audit/universe-actions'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  engagementId: string
  nextStep:     number
  planId:       string
}

export function AddProcedureForm({ engagementId, nextStep, planId }: Props) {
  const router = useRouter()
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<AuditTestProcedureInput>({
    resolver: zodResolver(auditTestProcedureSchema),
    defaultValues: {
      step_number:    nextStep,
      objective:      '',
      procedure_text: '',
      notes:          '',
    },
    mode: 'onBlur',
  })

  function onSubmit(values: AuditTestProcedureInput) {
    setError(null)
    startTransition(async () => {
      const result = await createAuditTestProcedure(engagementId, values)
      if ('error' in result) {
        setError(result.error)
      } else {
        form.reset({ step_number: nextStep + 1, objective: '', procedure_text: '', notes: '' })
        router.refresh()
      }
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
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <FormField control={form.control} name="step_number" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-medium text-navy-900">Step #</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    className="h-10 border-paper-border"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="objective" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-medium text-navy-900">Objective <span className="text-err">*</span></FormLabel>
                <FormControl>
                  <Input type="text" placeholder="What is being tested..." className="h-10 border-paper-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="procedure_text" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] font-medium text-navy-900">Procedure <span className="text-err">*</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Describe how to perform this test..." className="border-paper-border resize-none" rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] font-medium text-navy-900">Notes</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Optional notes..." className="h-10 border-paper-border" {...field} value={field.value ?? ''} />
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
            Add Procedure
          </Button>
        </form>
      </Form>
    </div>
  )
}
