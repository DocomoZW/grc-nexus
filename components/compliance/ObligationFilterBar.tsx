'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { REGULATORY_FRAMEWORK_LABELS, OBLIGATION_STATUS_LABELS } from '@/types/compliance'
import type { RegulatoryFramework, ObligationStatus } from '@/types/compliance'
import { cn } from '@/lib/utils'

const FRAMEWORK_OPTIONS = Object.entries(REGULATORY_FRAMEWORK_LABELS) as [RegulatoryFramework, string][]
const STATUS_OPTIONS = Object.entries(OBLIGATION_STATUS_LABELS) as [ObligationStatus, string][]

interface ObligationFilterBarProps {
  framework: string
  status: string
  owner: string
  owners: { id: string; name: string }[]
  onFilterChange: (columnId: string, value: string) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function ObligationFilterBar({
  framework,
  status,
  owner,
  owners,
  onFilterChange,
  hasActiveFilters,
  onClearFilters,
}: ObligationFilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 rounded-[10px] border border-paper-border bg-white p-4">
      <Select value={framework} onValueChange={(value) => onFilterChange('framework', value)}>
        <SelectTrigger
          className={cn(
            'h-10 w-[200px] border-paper-border text-[13px]',
            framework !== 'all' && 'ring-2 ring-gold/50',
          )}
        >
          <SelectValue placeholder="All frameworks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All frameworks</SelectItem>
          {FRAMEWORK_OPTIONS.map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(value) => onFilterChange('status', value)}>
        <SelectTrigger
          className={cn(
            'h-10 w-[180px] border-paper-border text-[13px]',
            status !== 'all' && 'ring-2 ring-gold/50',
          )}
        >
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={owner} onValueChange={(value) => onFilterChange('owner_id', value)}>
        <SelectTrigger
          className={cn(
            'h-10 w-[200px] border-paper-border text-[13px]',
            owner !== 'all' && 'ring-2 ring-gold/50',
          )}
        >
          <SelectValue placeholder="All owners" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All owners</SelectItem>
          {owners.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          className="h-10 border-paper-border text-[13px]"
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
