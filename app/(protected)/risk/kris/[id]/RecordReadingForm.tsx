'use client'
// app/(protected)/risk/kris/[id]/RecordReadingForm.tsx — Client Component
// Records a new KRI reading. Server action computes status automatically.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { kriReadingSchema, type KriReadingInput } from '@/lib/schemas/kri'
import { recordKriReading } from '@/lib/risk/kri-actions'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'

interface RecordReadingFormProps {
  kriId: string
}

export function RecordReadingForm({ kriId }: RecordReadingFormProps) {
  const router = useRouter()
  const [error, setError]            = useState<string | null>(null)
  const [success, setSuccess]        = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<KriReadingInput>({
    resolver: zodResolver(kriReadingSchema),
    defaultValues: {
      period_start: '',
      period_end:   '',
      actual_value: '' as unknown as number,
      notes:        '',
    },
    mode: 'onBlur',
  })

  function onSubmit(values: KriReadingInput) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await recordKriReading(kriId, values)
      if ('error' in result) {
        setError(result.error)
      } else {
        setSuccess(true)
        form.reset()
        router.refresh()
      }
    })
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert role="status" aria-live="polite" className="mb-4 border-ok/30 bg-ok/10 text-ok">
          <AlertDescription>Reading recorded successfully.</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="period_start" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Period Start</FormLabel>
                <FormControl>
                  <Input type="date" className="h-11 border-paper-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="period_end" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Period End</FormLabel>
                <FormControl>
                  <Input type="date" className="h-11 border-paper-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="actual_value" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Actual Value</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 7.5"
                  className="h-11 border-paper-border"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Notes <span className="text-navy-mid font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Any context for this reading..." className="border-paper-border resize-none" rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" disabled={isPending} className="mt-6 bg-gold text-navy-950 hover:bg-gold-hi h-11 px-6">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Reading
          </Button>
        </form>
      </Form>
    </div>
  )
}
