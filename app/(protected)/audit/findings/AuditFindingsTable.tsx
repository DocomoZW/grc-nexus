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
import { Eye, SearchX, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  AUDIT_FINDING_SEVERITY_LABELS,
  AUDIT_FINDING_STATUS_LABELS,
  type AuditFindingRow,
  type AuditFindingSeverity,
  type AuditFindingStatus,
} from '@/types/audit'
import { AUDIT_FINDING_STATUS_BADGE, isAuditFindingOverdue } from '@/lib/audit/audit-utils'

const column = createColumnHelper<AuditFindingRow>()

function SeverityBadge({ severity }: { severity: AuditFindingSeverity }) {
  const classes: Record<AuditFindingSeverity, string> = {
    low: 'bg-ok/10 text-ok border border-ok/30',
    medium: 'bg-teal-50 text-teal-700 border border-teal-200',
    high: 'bg-warn/10 text-warn border border-warn/30',
    critical: 'bg-err/10 text-err border border-err/30 font-semibold',
  }

  return (
    <span className={cn('inline-flex rounded-[6px] px-[8px] py-[4px] text-[14px] font-medium', classes[severity])}>
      {AUDIT_FINDING_SEVERITY_LABELS[severity]}
    </span>
  )
}

export function AuditFindingsTable({ rows }: { rows: AuditFindingRow[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])

  const severity = (columnFilters.find((f) => f.id === 'severity')?.value as string) ?? 'all'
  const status = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? 'all'
  const owner = (columnFilters.find((f) => f.id === 'remediation_owner_id')?.value as string) ?? 'all'

  const hasActiveFilters = severity !== 'all' || status !== 'all' || owner !== 'all'

  const owners = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach((row) => {
      map.set(row.remediation_owner_id ?? 'unassigned', row.remediation_owner_name)
    })
    return Array.from(map.entries())
  }, [rows])

  const columns = useMemo(
    () => [
      column.accessor('finding_reference', {
        header: 'Reference',
        cell: (info) => <span className="font-mono text-[14px] text-navy-mid">{info.getValue()}</span>,
      }),
      column.accessor('title', {
        header: 'Title',
        cell: (info) => (
          <Link href={`/audit/findings/${info.row.original.id}`} className="font-medium text-navy-900 hover:underline">
            {info.getValue()}
          </Link>
        ),
      }),
      column.accessor('severity', {
        header: 'Severity',
        cell: (info) => <SeverityBadge severity={info.getValue()} />,
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
      }),
      column.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <span className={cn('inline-flex font-medium', AUDIT_FINDING_STATUS_BADGE[info.getValue()])}>
            {AUDIT_FINDING_STATUS_LABELS[info.getValue()]}
          </span>
        ),
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
      }),
      column.accessor('remediation_owner_name', {
        header: 'Owner',
        cell: (info) => <span className="text-[14px] text-navy-900">{info.getValue()}</span>,
      }),
      column.accessor('remediation_owner_id', {
        header: 'Owner Filter',
        enableHiding: true,
        cell: () => null,
        filterFn: (row, id, value) => value === 'all' || row.getValue(id) === value,
      }),
      column.accessor('due_date', {
        header: 'Due Date',
        cell: (info) => {
          const overdue = isAuditFindingOverdue(info.row.original.status, info.getValue())
          return (
            <span className={cn('font-mono text-[14px]', overdue ? 'font-semibold text-err' : 'text-navy-mid')}>
              {info.getValue()}
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
              <Button variant="ghost" size="icon" asChild aria-label={`View finding: ${info.row.original.title}`}>
                <Link href={`/audit/findings/${info.row.original.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View finding</TooltipContent>
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
    initialState: {
      columnVisibility: {
        remediation_owner_id: false,
      },
    },
  })

  function handleFilterChange(columnId: string, value: string) {
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== columnId)
      next.push({ id: columnId, value })
      return next
    })
  }

  function handleClearFilters() {
    setColumnFilters([])
  }

  const visibleRows = table.getRowModel().rows

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-[10px] border border-paper-border bg-white p-4 md:grid-cols-3">
        <label className="text-[13px] text-navy-mid">
          Severity
          <select
            className="mt-1 h-10 w-full rounded-[8px] border border-paper-border bg-white px-3 text-[14px] text-navy-900"
            value={severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
          >
            <option value="all">All severities</option>
            {(Object.keys(AUDIT_FINDING_SEVERITY_LABELS) as AuditFindingSeverity[]).map((item) => (
              <option key={item} value={item}>{AUDIT_FINDING_SEVERITY_LABELS[item]}</option>
            ))}
          </select>
        </label>

        <label className="text-[13px] text-navy-mid">
          Status
          <select
            className="mt-1 h-10 w-full rounded-[8px] border border-paper-border bg-white px-3 text-[14px] text-navy-900"
            value={status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All statuses</option>
            {(Object.keys(AUDIT_FINDING_STATUS_LABELS) as AuditFindingStatus[]).map((item) => (
              <option key={item} value={item}>{AUDIT_FINDING_STATUS_LABELS[item]}</option>
            ))}
          </select>
        </label>

        <label className="text-[13px] text-navy-mid">
          Owner
          <select
            className="mt-1 h-10 w-full rounded-[8px] border border-paper-border bg-white px-3 text-[14px] text-navy-900"
            value={owner}
            onChange={(e) => handleFilterChange('remediation_owner_id', e.target.value)}
          >
            <option value="all">All owners</option>
            {owners.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
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
                  {hasActiveFilters ? (
                    <div className="flex flex-col items-center gap-2">
                      <SearchX className="h-10 w-10 text-paper-border" aria-hidden="true" />
                      <p className="text-[14px] text-navy-mid">No findings match your filters.</p>
                      <button type="button" onClick={handleClearFilters} className="text-[13px] text-navy-mid underline hover:no-underline">
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="h-10 w-10 text-paper-border" aria-hidden="true" />
                      <p className="text-[14px] text-navy-mid">No findings recorded.</p>
                      <Link href="/audit/findings/new" className="inline-flex items-center rounded-[8px] bg-gold px-8 py-2 text-[14px] font-semibold text-navy-950 hover:bg-gold-hi">
                        New Finding
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const isOverdue = isAuditFindingOverdue(row.original.status, row.original.due_date)
                return (
                  <tr key={row.id} className={cn('border-b border-paper-border hover:bg-gray-50', isOverdue && 'border-l-[3px] border-l-err bg-err/5')}>
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
