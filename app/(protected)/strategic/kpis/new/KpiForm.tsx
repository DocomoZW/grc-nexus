'use client'
// KpiForm.tsx — Client Component
// KPI creation form following RegisterForm.tsx pattern exactly.
// react-hook-form + Zod resolver, calls createKpi Server Action on submit.
// IMPORTANT: baseline_value and target_value are registered as strings (type="number" in DOM);
// z.coerce.number() in kpiSchema handles string-to-number coercion.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { kpiSchema, type KpiInput } from '@/lib/schemas/strategic'
import { createKpi } from '@/lib/strategic/actions'
import { KPI_FREQUENCY_LABELS } from '@/types/strategic'
import type { KpiFrequency } from '@/types/strategic'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface KpiFormProps {
  objectives: { id: string; title: string }[]
  owners: { id: string; full_name: string }[]
}

const KPI_FREQUENCY_OPTIONS = Object.entries(KPI_FREQUENCY_LABELS) as [KpiFrequency, string][]

export function KpiForm({ objectives, owners }: KpiFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<KpiInput>({
    resolver: zodResolver(kpiSchema),
    defaultValues: {
      objective_id: '',
      title: '',
      description: '',
      owner_id: '',
      unit_of_measure: '',
      baseline_value: '' as unknown as number,
      target_value: '' as unknown as number,
      reporting_frequency: 'quarterly',
    },
    mode: 'onBlur',
  })

  function onSubmit(values: KpiInput) {
    setError(null)
    startTransition(async () => {
      const result = await createKpi(values)
      if (result?.error) {
        setError(result.error)
      } else {
        // Redirect to parent objective detail page (KPI is now linked there)
        router.push(`/strategic/objectives/${values.objective_id}`)
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

          {/* 1. Objective */}
          <FormField
            control={form.control}
            name="objective_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Objective</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue placeholder="Select an objective" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {objectives.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>{obj.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 2. Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">Title</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. Revenue growth rate"
                    className="h-11 border-paper-border"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 3. Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">
                  Description <span className="text-navy-mid font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide additional context..."
                    className="border-paper-border resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-t border-paper-border my-6" />

          {/* 4. Owner */}
          <FormField
            control={form.control}
            name="owner_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Owner</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue placeholder="Select an owner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>{owner.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 5. Unit of Measure */}
          <FormField
            control={form.control}
            name="unit_of_measure"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">Unit of Measure</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. %, ZWL, count"
                    className="h-11 border-paper-border"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 6 & 7. Baseline Value + Target Value */}
          <div className="flex gap-4 mt-4">
            <FormField
              control={form.control}
              name="baseline_value"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-[14px] font-medium text-navy-900">Baseline Value</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Current starting value"
                      className="h-11 border-paper-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-[14px] font-medium text-navy-900">Target Value</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Target to achieve"
                      className="h-11 border-paper-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 8. Reporting Frequency */}
          <FormField
            control={form.control}
            name="reporting_frequency"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">Reporting Frequency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {KPI_FREQUENCY_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="mt-6 h-11 bg-gold text-navy-950 hover:bg-gold-hi font-semibold text-[14px] px-8"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create KPI
          </Button>
        </form>
      </Form>
    </div>
  )
}
