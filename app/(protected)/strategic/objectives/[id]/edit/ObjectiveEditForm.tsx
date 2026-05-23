'use client'
// ObjectiveEditForm.tsx — Client Component
// Same structure as ObjectiveForm but pre-populated from existing objective.
// Calls updateObjective(id, values) instead of createObjective.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { objectiveSchema, type ObjectiveInput } from '@/lib/schemas/strategic'
import { updateObjective } from '@/lib/strategic/actions'
import { NDS2_PILLAR_LABELS, OBJECTIVE_STATUS_LABELS } from '@/types/strategic'
import type { StrategicObjective, Nds2Pillar, ObjectiveStatus } from '@/types/strategic'
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

interface ObjectiveEditFormProps {
  objective: StrategicObjective
  owners: { id: string; full_name: string }[]
}

const NDS2_PILLAR_OPTIONS = Object.entries(NDS2_PILLAR_LABELS) as [Nds2Pillar, string][]
const OBJECTIVE_STATUS_OPTIONS = Object.entries(OBJECTIVE_STATUS_LABELS) as [ObjectiveStatus, string][]

export function ObjectiveEditForm({ objective, owners }: ObjectiveEditFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ObjectiveInput>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: objective.title ?? '',
      description: objective.description ?? '',
      nds2_pillar: objective.nds2_pillar ?? null,
      institutional_goal: objective.institutional_goal ?? '',
      owner_id: objective.owner_id ?? '',
      start_date: objective.start_date ?? '',
      target_date: objective.target_date ?? '',
      status: objective.status,
    },
    mode: 'onBlur',
  })

  function onSubmit(values: ObjectiveInput) {
    setError(null)
    startTransition(async () => {
      const result = await updateObjective(objective.id, values)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push(`/strategic/objectives/${objective.id}`)
      }
    })
  }

  return (
    <div className="bg-white rounded-[10px] border border-paper-border shadow-card p-8 max-w-2xl">
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>

          {/* 1. Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Title</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    className="h-11 border-paper-border"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 2. Description */}
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

          {/* 3. NDS2 Pillar */}
          <FormField
            control={form.control}
            name="nds2_pillar"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">
                  NDS2 Pillar <span className="text-navy-mid font-normal">(optional)</span>
                </FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v === '' ? null : v as Nds2Pillar)}
                >
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue placeholder="Select a NDS2 pillar (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {NDS2_PILLAR_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Cross-field validation error renders here (path: ['nds2_pillar'] in schema) */}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 4. Institutional Goal */}
          <FormField
            control={form.control}
            name="institutional_goal"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">
                  Institutional Goal <span className="text-navy-mid font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Or describe an institutional 5-year goal"
                    className="h-11 border-paper-border"
                    {...field}
                  />
                </FormControl>
                <p className="text-[13px] text-navy-mid mt-1">
                  Or describe an institutional 5-year goal
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-t border-paper-border my-6" />

          {/* 5. Owner */}
          <FormField
            control={form.control}
            name="owner_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Owner</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue placeholder="Select an owner..." />
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

          {/* 6 & 7. Start Date + Target Date */}
          <div className="flex gap-4 mt-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-[14px] font-medium text-navy-900">
                    Start Date <span className="text-navy-mid font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="h-11 border-paper-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target_date"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-[14px] font-medium text-navy-900">
                    Target Date <span className="text-navy-mid font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="h-11 border-paper-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 8. Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OBJECTIVE_STATUS_OPTIONS.map(([value, label]) => (
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
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  )
}
