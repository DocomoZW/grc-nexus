'use client'
// components/analytics/ForecastChart.tsx
// Full forecast chart — ComposedChart with ReferenceArea forecast band.
// CRITICAL: 'use client' required — Recharts uses browser SVG APIs.
// CRITICAL: isAnimationActive={false} — matches KpiSparkline.tsx established pattern.
// CRITICAL: forecastBand uses y1/y2 (horizontal band), NOT x1/x2.

import {
  ComposedChart, Line, ReferenceArea, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface ForecastChartProps {
  data: { period: string; value: number | null }[]
  forecastBand: { lower: number; upper: number }
  targetValue: number
  statusColor: string
}

export function ForecastChart({ data, forecastBand, targetValue, statusColor }: ForecastChartProps) {
  return (
    <div className="w-full h-[200px]" role="img" aria-label="Forecast chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D7E2EF" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#3A5270' }} />
          <YAxis tick={{ fontSize: 11, fill: '#3A5270' }} width={40} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          <ReferenceLine
            y={targetValue}
            strokeDasharray="4 2"
            stroke="#3A5270"
            strokeOpacity={0.6}
          />
          <ReferenceArea
            y1={forecastBand.lower}
            y2={forecastBand.upper}
            fill="#C8A44A"
            fillOpacity={0.15}
            stroke="#C8A44A"
            strokeOpacity={0.4}
            ifOverflow="extendDomain"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={statusColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
