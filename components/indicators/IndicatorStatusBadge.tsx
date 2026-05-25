'use client'
// components/indicators/IndicatorStatusBadge.tsx
// Reusable badge for IndicatorStatus values (on_track / at_risk / breached / no_data).
// Used by both KRI and KCI list and detail pages.

import { Badge } from '@/components/ui/badge'
import { INDICATOR_STATUS_BADGE } from '@/lib/risk/kri-utils'
import type { IndicatorStatus } from '@/types/kri'

interface IndicatorStatusBadgeProps {
  status: IndicatorStatus
}

export function IndicatorStatusBadge({ status }: IndicatorStatusBadgeProps) {
  const config = INDICATOR_STATUS_BADGE[status]
  return (
    <Badge className={`text-[12px] font-medium border ${config.className}`}>
      {config.label}
    </Badge>
  )
}
