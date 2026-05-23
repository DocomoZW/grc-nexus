'use client'
// app/(protected)/strategic/KpiSparkline.tsx
// Mini line chart — no axes, no labels, no tooltip. (D-20)
// Shows up to last 6 readings for trend visualization.
// CRITICAL: isAnimationActive={false} — prevents table cell layout jank during re-renders.
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { KpiStatus } from '@/lib/strategic/kpi-utils'

interface SparklineProps {
  readings: { actual_value: number; reporting_period: string }[]
  status: KpiStatus
}

// Hex values match tailwind.config.ts token definitions exactly.
// Recharts renders SVG attributes — cannot use Tailwind class names here.
const SPARKLINE_COLOR: Record<KpiStatus, string> = {
  on_track:  '#27AE60',
  at_risk:   '#E67E22',
  off_track: '#E74C3C',
  no_data:   '#D7E2EF',
}

export function KpiSparkline({ readings, status }: SparklineProps) {
  // Sort oldest-first for left-to-right trend, then take last 6
  const data = [...readings]
    .sort((a, b) => a.reporting_period.localeCompare(b.reporting_period))
    .slice(-6)
    .map((r) => ({ value: r.actual_value }))

  if (data.length === 0) {
    // Gray placeholder rectangle — same 80x32px dimensions
    return <div className="w-[80px] h-[32px] rounded bg-paper-border/30" />
  }

  return (
    // Sized parent div is REQUIRED — ResponsiveContainer needs a parent with explicit dimensions
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
