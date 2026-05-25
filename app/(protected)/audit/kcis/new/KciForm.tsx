'use client'
// app/(protected)/audit/kcis/new/KciForm.tsx — Client Component
// KCI creation form — mirrors KriForm.tsx exactly with KCI-specific terminology.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { kciDefinitionSchema, type KciDefinitionInput } from '@/lib/schemas/kci'
import { createKciDefinition } from '@/lib/audit/kci-actions'
import { DIRECTION_LABELS } from '@/lib/risk/kri-utils'
import { KPI_FREQUENCY_LABELS } from '@/types/strategic'
import type { KpiFrequency, IndicatorDirection } from '@/types/kci'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface KciFormProps {
  treatments: { id: string; title: string }[]
  owners:     { id: string; first_name: string | null; last_name: string | null }[]
}

const DIRECTION_OPTIONS = Object.entries(DIRECTION_LABELS) as [IndicatorDirection, string][]
const FREQUENCY_OPTIONS = Object.entries(KPI_FREQUENCY_LABELS) as [KpiFrequency, string][]

export function KciForm({ treatments, owners }: KciFormProps) {
  const router = useRouter()
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<KciDefinitionInput>({
    resolver: zodResolver(kciDefinitionSchema),
    defaultValues: {
      title:               '',
      description:         '',
      treatment_id:        null,
      unit_of_measure:     '',
      target_value:        '' as unknown as number,
      alert_threshold:     '' as unknown as number,
      direction:           'lower_is_worse',
      owner_id:            '',
      reporting_frequency: 'quarterly',
    },
    mode: 'onBlur',
  })

  function onSubmit(values: KciDefinitionInput) {
    setError(null)
    startTransition(async () => {
      const result = await createKciDefinition(values)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.push(`/audit/kcis/${result.data.id}`)
      }
    })
  }

  return (
    <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-8">
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>

          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[14px] font-medium text-navy-900">Title</FormLabel>
              <FormControl>
                <Input type="text" placeholder="e.g. Control pass rate" className="h-11 border-paper-border" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Description <span className="text-navy-mid font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Describe this KCI..." className="border-paper-border resize-none" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="treatment_id" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Linked Treatment <span className="text-navy-mid font-normal">(optional)</span></FormLabel>
              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                <FormControl>
                  <SelectTrigger className="h-11 border-paper-border">
                    <SelectValue placeholder="Select a treatment (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {treatments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="direction" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Direction</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 border-paper-border">
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DIRECTION_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <div className="mt-4 grid grid-cols-3 gap-4">
            <FormField control={form.control} name="unit_of_measure" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Unit</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="%, count, days" className="h-11 border-paper-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="target_value" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Target</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="95" className="h-11 border-paper-border" {...field} onChange={(e) => field.onChange(e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="alert_threshold" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Alert Threshold</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="80" className="h-11 border-paper-border" {...field} onChange={(e) => field.onChange(e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="owner_id" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Owner</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 border-paper-border">
                    <SelectValue placeholder="Assign an owner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {[o.first_name, o.last_name].filter(Boolean).join(' ') || o.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="reporting_frequency" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-[14px] font-medium text-navy-900">Reporting Frequency</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 border-paper-border">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <div className="mt-8 flex items-center gap-3">
            <Button type="submit" disabled={isPending} className="bg-gold text-navy-950 hover:bg-gold-hi h-11 px-6">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create KCI
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 border-paper-border">
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
