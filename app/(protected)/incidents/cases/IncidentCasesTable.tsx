'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import { Eye, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { IncidentCategoryBadge } from '@/components/incidents/IncidentCategoryBadge'
import { INCIDENT_STATUS_LABELS, type IncidentCategory, type IncidentStatus } from '@/types/incidents'

interface IncidentCaseListRow {
  id: string
  case_reference: string
  title: string
  category: IncidentCategory
  status: IncidentStatus
  severity: 'low' | 'medium' | 'high' | 'critical'
  is_anonymous: boolean
  assigned_investigator_id: string | null
  assigned_investigator_name: string
  sla_due_date: string | null
  created_at: string
}

const column = createColumnHelper<IncidentCaseListRow>()

const STATUS_BADGE: Record<IncidentStatus, string> = {
  new: 'bg-paper text-navy-mid border-paper-border',
  assigned: 'bg-blue-50 text-blue-700 border-blue-200',
  in_investigation: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  escalated: 'bg-err/10 text-err border-err/30',
  closed: 'bg-ok/10 text-ok border-ok/30',
}

export function IncidentCasesTable({ rows }: { rows: IncidentCaseListRow[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])

  const status = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? 'all'
  const category = (columnFilters.find((f) => f.id === 'category')?.value as string) ?? 'all'
  const severity = (columnFilters.find((f) => f.id === 'severity')?.value as string) ?? 'all'

  const columns = useMemo(
    () => [
      column.accessor('case_reference', {
        header: 'Case',
        cell: (info) => <span className="font-mono text-[14px] text-navy-mid">{info.getValue()}</span>,
      }),
      column.accessor('title', {
        header: 'Title',
        cell: (info) => (
          <Link href={`/incidents/cases/${info.row.original.id}`} className="font-medium text-navy-900 hover:underline">
            {info.getValue()}
          </Link>
        ),
      }),
      column.accessor('category', {
        header: 'Category',
        cell: (info) => <IncidentCategoryBadge category={info.getValue()} />,
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
      }),
      column.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <span className={cn('inline-flex rounded-[6px] border px-[8px] py-[4px] text-[13px] font-medium', STATUS_BADGE[info.getValue()])}>
            {INCIDENT_STATUS_LABELS[info.getValue()]}
          </span>
        ),
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
      }),
      column.accessor('severity', {
        header: 'Severity',
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
      }),
      column.accessor('assigned_investigator_name', {
        header: 'Investigator',
      }),
      column.accessor('sla_due_date', {
        header: 'SLA Due',
        cell: (info) => {
          const raw = info.getValue()
          if (!raw) return <span className="text-[13px] text-navy-mid">N/A</span>
          const overdue = new Date(raw) < new Date()
          return (
            <span className={cn('font-mono text-[13px]', overdue ? 'font-semibold text-err' : 'text-navy-mid')}>
              {new Date(raw).toISOString().slice(0, 10)}
            </span>
          )
        },
      }),
      column.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild aria-label={`View case: ${info.row.original.title}`}>
                <Link href={`/incidents/cases/${info.row.original.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View case</TooltipContent>
          </Tooltip>
        ),
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters, sorting },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  function onFilter(columnId: 'status' | 'category' | 'severity', value: string) {
    setColumnFilters((prev) => {
      const next = prev.filter((item) => item.id !== columnId)
      next.push({ id: columnId, value })
      return next
    })
  }

  const visibleRows = table.getRowModel().rows

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-[10px] border border-paper-border bg-white p-4 md:grid-cols-3">
        <label className="text-[13px] text-navy-mid">
          Status
          <select
            className="mt-1 h-10 w-full rounded-[8px] border border-paper-border bg-white px-3 text-[14px] text-navy-900"
            value={status}
            onChange={(event) => onFilter('status', event.target.value)}
          >
            <option value="all">All statuses</option>
            {(['new', 'assigned', 'in_investigation', 'escalated', 'closed'] as IncidentStatus[]).map((item) => (
              <option key={item} value={item}>
                {INCIDENT_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[13px] text-navy-mid">
          Category
          <select
            className="mt-1 h-10 w-full rounded-[8px] border border-paper-border bg-white px-3 text-[14px] text-navy-900"
            value={category}
            onChange={(event) => onFilter('category', event.target.value)}
          >
            <option value="all">All categories</option>
            {(['fraud', 'misconduct', 'safety', 'cyber', 'governance', 'other'] as IncidentCategory[]).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[13px] text-navy-mid">
          Severity
          <select
            className="mt-1 h-10 w-full rounded-[8px] border border-paper-border bg-white px-3 text-[14px] text-navy-900"
            value={severity}
            onChange={(event) => onFilter('severity', event.target.value)}
          >
            <option value="all">All severity levels</option>
            {(['low', 'medium', 'high', 'critical'] as const).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-paper-border bg-white shadow-card">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="bg-paper">
                {group.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <SearchX className="h-10 w-10 text-paper-border" aria-hidden="true" />
                    <p className="text-[14px] text-navy-mid">No incident cases match your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.id} className="border-b border-paper-border hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
