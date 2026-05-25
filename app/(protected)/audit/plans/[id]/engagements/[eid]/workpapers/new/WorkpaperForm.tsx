'use client'
// app/(protected)/audit/plans/[id]/engagements/[eid]/workpapers/new/WorkpaperForm.tsx
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { auditWorkpaperSchema, type AuditWorkpaperInput } from '@/lib/schemas/audit-universe'
import { createAuditWorkpaper } from '@/lib/audit/universe-actions'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  engagementId: string
  planId:       string
}

export function WorkpaperForm({ engagementId, planId }: Props) {
  const router = useRouter()
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<AuditWorkpaperInput>({
    resolver: zodResolver(auditWorkpaperSchema),
    defaultValues: {
      title:            '',
      reference_number: '',
      description:      '',
    },
    mode: 'onBlur',
  })

  function onSubmit(values: AuditWorkpaperInput) {
    setError(null)
    startTransition(async () => {
      const result = await createAuditWorkpaper(engagementId, values)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.push(`/audit/plans/${planId}/engagements/${engagementId}`)
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
                <Input type="text" placeholder="e.g. Cash Reconciliation Worksheet" className="h-11 border-paper-border" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="reference_number" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[14px] font-medium text-navy-900">Reference Number</FormLabel>
              <FormControl>
                <Input type="text" placeholder="e.g. WP-2026-001" className="h-11 border-paper-border font-mono" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[14px] font-medium text-navy-900">Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the purpose of this workpaper..." className="border-paper-border resize-none" rows={3} {...field} value={field.value ?? ''} />
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
            Add Workpaper
          </Button>
        </form>
      </Form>
    </div>
  )
}
