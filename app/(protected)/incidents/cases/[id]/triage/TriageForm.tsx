'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { incidentTriageSchema, type IncidentTriageInput } from '@/lib/schemas/incidents'
import { assignIncidentInvestigator } from '@/lib/incidents/actions'

interface InvestigatorOption {
  id: string
  name: string
  role: string
}

interface TriageFormProps {
  caseId: string
  initialAssigneeId: string | null
  investigators: InvestigatorOption[]
}

export function TriageForm({ caseId, initialAssigneeId, investigators }: TriageFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<IncidentTriageInput>({
    resolver: zodResolver(incidentTriageSchema),
    defaultValues: {
      assigned_investigator_id: initialAssigneeId ?? '',
      severity: 'medium',
      visibility: 'investigator_admin_only',
      notes: '',
    },
    mode: 'onBlur',
  })

  function onSubmit(values: IncidentTriageInput) {
    setError(null)
    startTransition(async () => {
      const result = await assignIncidentInvestigator(caseId, values)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
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
            name="assigned_investigator_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Investigator</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-paper-border">
                      <SelectValue placeholder="Select investigator" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {investigators.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} ({person.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[14px] font-medium text-navy-900">Severity</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 border-paper-border">
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {severity}
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
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[14px] font-medium text-navy-900">Visibility</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 border-paper-border">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="investigator_admin_only">Investigator + Admin Only</SelectItem>
                      <SelectItem value="oversight_visible">Oversight Visible</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Triage Notes (optional)</FormLabel>
                <FormControl>
                  <Input className="h-11 border-paper-border" placeholder="Optional context for assignment" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="h-11 bg-gold px-8 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Triage Assignment
          </Button>
        </form>
      </Form>
    </div>
  )
}
