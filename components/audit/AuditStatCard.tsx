import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditStatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  accent: string
  description?: string
}

export function AuditStatCard({ icon: Icon, label, value, accent, description }: AuditStatCardProps) {
  return (
    <div className="rounded-[10px] border border-paper-border bg-white p-4 shadow-card">
      <div className="mb-[8px] flex items-center gap-[8px]">
        <Icon className={cn('h-[18px] w-[18px]', accent)} aria-hidden="true" />
        <p className="text-[12px] uppercase tracking-wider text-navy-mid">{label}</p>
      </div>
      <p className={cn('font-mono text-[28px] font-semibold', accent)}>{value}</p>
      {description && <p className="mt-[4px] text-[14px] text-navy-mid">{description}</p>}
    </div>
  )
}
