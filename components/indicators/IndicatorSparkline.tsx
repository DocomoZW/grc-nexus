'use client'
// components/indicators/IndicatorSparkline.tsx
// Mini line chart for KRI/KCI reading trends.
// Same pattern as KpiSparkline.tsx — no axes, no labels, no tooltip.
// CRITICAL: isAnimationActive={false} — prevents table cell layout jank.

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { IndicatorStatus } from '@/types/kri'

interface IndicatorSparklineProps {
  readings: { actual_value: number; recorded_at: string }[]
  status: IndicatorStatus
}

// Hex values match tailwind.config.ts token definitions exactly.
const SPARKLINE_COLOR: Record<IndicatorStatus, string> = {
  on_track: '#27AE60',
  at_risk:  '#E67E22',
  breached: '#E74C3C',
  no_data:  '#D7E2EF',
}

export function IndicatorSparkline({ readings, status }: IndicatorSparklineProps) {
  const data = [...readings]
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .slice(-6)
    .map((r) => ({ value: r.actual_value }))

  if (data.length === 0) {
    return <div className="w-[80px] h-[32px] rounded bg-paper-border/30" />
  }

  return (
    <div className="w-[80px] h-[32px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={SPARKLINE_COLOR[status]}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
