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
import { Eye, Pencil, ClipboardList, SearchX } from 'lucide-react'
import { ObligationFilterBar } from '@/components/compliance/ObligationFilterBar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  OBLIGATION_STATUS_BADGE,
  isObligationOverdue,
} from '@/lib/compliance/compliance-utils'
import {
  REGULATORY_FRAMEWORK_LABELS,
  OBLIGATION_STATUS_LABELS,
} from '@/types/compliance'
import type { ObligationRow, RegulatoryFramework } from '@/types/compliance'

const column = createColumnHelper<ObligationRow>()

function FrameworkBadge({ framework }: { framework: RegulatoryFramework }) {
  const classes: Record<RegulatoryFramework, string> = {
    pecoga:    'bg-purple-50 text-purple-700 border border-purple-200',
    ppdpa:     'bg-blue-50 text-blue-700 border border-blue-200',
    nds2:      'bg-teal-50 text-teal-700 border border-teal-200',
    iso_37000: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    king_iv:   'bg-amber-50 text-amber-700 border border-amber-200',
    ipsas:     'bg-cyan-50 text-cyan-700 border border-cyan-200',
    pfma:      'bg-orange-50 text-orange-700 border border-orange-200',
    other:     'bg-gray-100 text-gray-600 border border-gray-300',
  }
  return (
    <span className={cn(
      'inline-flex rounded-[6px] px-[8px] py-[4px] text-[14px] font-medium',
      classes[framework]
    )}>
      {REGULATORY_FRAMEWORK_LABELS[framework]}
    </span>
  )
}

export function ObligationsTable({ rows }: { rows: ObligationRow[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])

  const framework = (columnFilters.find((f) => f.id === 'framework')?.value as string) ?? 'all'
  const status = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? 'all'
  const owner = (columnFilters.find((f) => f.id === 'owner_id')?.value as string) ?? 'all'

  const hasActiveFilters = framework !== 'all' || status !== 'all' || owner !== 'all'

  const owners = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach((row) => {
      if (row.owner_id) map.set(row.owner_id, row.owner_name)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rows])

  const columns = useMemo(
    () => [
      // Title (flex-1, sortable)
      column.accessor('title', {
        header: 'Title',
        cell: (info) => (
          <Link
            href={`/compliance/obligations/${info.row.original.id}`}
            className="font-medium text-navy-900 hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
        enableSorting: true,
      }),
      // Framework badge (120px, sortable)
      column.accessor('framework', {
        header: 'Framework',
        cell: (info) => <FrameworkBadge framework={info.getValue()} />,
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
        enableSorting: true,
      }),
      // Due Date (DM Mono, 110px, sortable, err if overdue)
      column.accessor('due_date', {
        header: 'Due Date',
        cell: (info) => {
          const row = info.row.original
          const overdue = isObligationOverdue(row.status, row.due_date)
          return (
            <span className={cn('font-mono text-[14px]', overdue ? 'text-err font-semibold' : 'text-navy-mid')}>
              {info.getValue()}
            </span>
          )
        },
        enableSorting: true,
      }),
      // Status badge (140px, sortable)
      column.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <span className={cn('inline-flex font-medium', OBLIGATION_STATUS_BADGE[info.getValue()])}>
            {OBLIGATION_STATUS_LABELS[info.getValue()]}
          </span>
        ),
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
        enableSorting: true,
      }),
      // Owner (name, 140px)
      column.accessor('owner_name', {
        header: 'Owner',
        cell: (info) => <span className="text-[14px] text-navy-900">{info.getValue()}</span>,
        enableSorting: true,
      }),
      // Hidden owner_id column for filtering
      column.accessor('owner_id', {
        header: 'Owner Filter',
        enableHiding: true,
        cell: () => null,
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
      }),
      // Evidence count chip (80px)
      column.accessor('evidence_count', {
        header: 'Evidence',
        cell: (info) => (
          <span className="inline-flex items-center rounded-full bg-paper px-2 py-0.5 text-[13px] font-medium text-navy-mid">
            {info.getValue()}
          </span>
        ),
        enableSorting: true,
      }),
      // Actions (View + Edit, 80px)
      column.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild aria-label={`View obligation: ${info.row.original.title}`}>
                  <Link href={`/compliance/obligations/${info.row.original.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View obligation</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild aria-label={`Edit obligation: ${info.row.original.title}`}>
                  <Link href={`/compliance/obligations/${info.row.original.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit obligation</TooltipContent>
            </Tooltip>
          </div>
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
    initialState: {
      columnVisibility: {
        owner_id: false,
      },
    },
  })

  function handleFilterChange(columnId: string, value: string) {
    setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== columnId)
      filtered.push({ id: columnId, value })
      return filtered
    })
  }

  function handleClearFilters() {
    setColumnFilters([])
  }

  const visibleRows = table.getRowModel().rows

  return (
    <div>
      <ObligationFilterBar
        framework={framework}
        status={status}
        owner={owner}
        owners={owners}
        onFilterChange={handleFilterChange}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      <div className="overflow-x-auto rounded-[10px] border border-paper-border bg-white shadow-card">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="bg-paper">
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-navy-mid"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  {hasActiveFilters ? (
                    <div className="flex flex-col items-center gap-2">
                      <SearchX className="h-10 w-10 text-paper-border" aria-hidden="true" />
                      <p className="text-[14px] text-navy-mid">No obligations match your filters.</p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-[13px] text-navy-mid underline hover:no-underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="h-10 w-10 text-paper-border" aria-hidden="true" />
                      <p className="text-[14px] text-navy-mid">No obligations recorded.</p>
                      <Link
                        href="/compliance/obligations/new"
                        className="inline-flex items-center rounded-[8px] bg-gold px-8 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi"
                      >
                        Add Obligation
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const isOverdue = isObligationOverdue(row.original.status, row.original.due_date)
                const today = new Date()
                const dueDate = new Date(row.original.due_date)
                const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const isExpiringSoon = daysUntilDue >= 0 && daysUntilDue <= 7 && row.original.status !== 'compliant' && row.original.status !== 'waived'

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-paper-border hover:bg-gray-50',
                      isOverdue && 'border-l-[3px] border-l-err bg-err/5',
                      !isOverdue && isExpiringSoon && 'border-l-[3px] border-l-warn',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
