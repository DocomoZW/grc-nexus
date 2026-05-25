'use client'
// components/esg/EsgReadingsChart.tsx
// Phase 12 — ESG metric trend chart using Recharts (LineChart).

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import type { EsgReading } from '@/types/esg'

interface Props {
  readings:    EsgReading[]
  targetValue: number | null
  unit:        string
}

export function EsgReadingsChart({ readings, targetValue, unit }: Props) {
  // Sort oldest first for the trend line
  const sorted = [...readings].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const chartData = sorted.map(r => ({
    period: r.period_label,
    actual: r.actual_value,
  }))

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Performance Trend</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            formatter={(value) => [`${value ?? ''} ${unit}`, 'Actual']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {targetValue != null && (
            <ReferenceLine
              y={targetValue}
              stroke="#16a34a"
              strokeDasharray="6 3"
              label={{ value: `Target: ${targetValue}`, fontSize: 11, fill: '#16a34a', position: 'insideTopRight' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="#0066cc"
            strokeWidth={2}
            dot={{ r: 4, fill: '#0066cc' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
