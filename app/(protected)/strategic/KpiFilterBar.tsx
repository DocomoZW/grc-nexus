'use client'
// app/(protected)/strategic/KpiFilterBar.tsx
// URL-based filter bar for the KPI summary grid. (D-21)
// Pushes filter state to URL query params using useRouter().
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function KpiFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') ?? 'all'
  )

  function handleApply() {
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== 'all') {
      params.set('status', statusFilter)
    }
    // Reset to page 1 when filters change
    params.set('page', '1')
    router.push(`/strategic?${params.toString()}`)
  }

  function handleClear() {
    setStatusFilter('all')
    router.push('/strategic')
  }

  return (
    <div className="flex items-end gap-4 mb-6 flex-wrap">
      {/* Status filter */}
      <div>
        <label className="text-[12px] font-medium text-navy-mid block mb-1">Status</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9 border-paper-border text-[13px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="off_track">Off Track</SelectItem>
            <SelectItem value="no_data">No Data</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Apply / Clear buttons */}
      <div className="flex gap-2 mt-5">
        <Button
          size="sm"
          className="h-9 bg-gold text-navy-950 hover:bg-gold-hi text-[13px] px-4"
          onClick={handleApply}
        >
          Apply filters
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 border-paper-border text-[13px]"
          onClick={handleClear}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
