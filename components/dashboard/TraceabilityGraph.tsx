'use client'
// components/dashboard/TraceabilityGraph.tsx
// Cross-module traceability graph rendered as an SVG dag.
// Layers: Strategic Objectives → KPIs → Risks → Controls → Audit Findings
// Clicking any node navigates to its detail page.
// No third-party chart library — pure SVG.

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// ── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id:    string
  label: string
  layer: number   // 0=objective, 1=kpi, 2=risk, 3=control, 4=finding
  href:  string
}

interface GraphEdge {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ── Layout constants ─────────────────────────────────────────────────────────

const LAYER_LABELS = ['Objectives', 'KPIs', 'Risks', 'Controls', 'Findings']
const LAYER_COLORS = ['#1e3a5f', '#0066cc', '#d97706', '#0d9488', '#dc2626']
const LAYER_X_PCT  = [0.08, 0.27, 0.50, 0.72, 0.92]  // proportional x per layer

const NODE_W = 110
const NODE_H = 28
const SVG_H  = 440
const SVG_W  = 900
const MAX_NODES_PER_LAYER = 6  // clamp long lists

// ── Data fetcher (runs on client using anon key + RLS) ────────────────────────

async function fetchGraphData(institutionId: string): Promise<GraphData> {
  if (!institutionId) return { nodes: [], edges: [] }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [
    { data: objectives },
    { data: kpis },
    { data: risks },
    { data: controls },
    { data: findings },
    { data: kpiLinks },
    { data: riskControls },
  ] = await Promise.all([
    supabase.from('strategic_objectives').select('id, title').eq('institution_id', institutionId).limit(MAX_NODES_PER_LAYER),
    supabase.from('kpis').select('id, name, objective_id').eq('institution_id', institutionId).limit(MAX_NODES_PER_LAYER),
    supabase.from('risks').select('id, title').eq('institution_id', institutionId).not('status', 'eq', 'closed').limit(MAX_NODES_PER_LAYER),
    supabase.from('controls').select('id, name, risk_id').eq('institution_id', institutionId).limit(MAX_NODES_PER_LAYER),
    supabase.from('audit_findings').select('id, title, risk_id').eq('institution_id', institutionId).not('status', 'eq', 'closed').limit(MAX_NODES_PER_LAYER),
    supabase.from('kpis').select('id, objective_id').eq('institution_id', institutionId).limit(50),
    supabase.from('controls').select('id, risk_id').eq('institution_id', institutionId).limit(50),
  ])

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  const objIds  = new Set<string>()
  const kpiIds  = new Set<string>()
  const riskIds = new Set<string>()
  const ctlIds  = new Set<string>()

  for (const o of objectives ?? []) {
    nodes.push({ id: `obj:${o.id}`, label: o.title, layer: 0, href: `/strategic/objectives/${o.id}` })
    objIds.add(o.id)
  }
  for (const k of kpis ?? []) {
    nodes.push({ id: `kpi:${k.id}`, label: k.name, layer: 1, href: `/strategic/kpis/${k.id}` })
    kpiIds.add(k.id)
  }
  for (const r of risks ?? []) {
    nodes.push({ id: `risk:${r.id}`, label: r.title, layer: 2, href: `/risk/${r.id}` })
    riskIds.add(r.id)
  }
  for (const c of controls ?? []) {
    nodes.push({ id: `ctl:${c.id}`, label: c.name, layer: 3, href: `/risk/controls/${c.id}` })
    ctlIds.add(c.id)
  }
  for (const f of findings ?? []) {
    nodes.push({ id: `finding:${f.id}`, label: f.title, layer: 4, href: `/audit/findings/${f.id}` })
  }

  // Edges: KPI → Objective
  for (const k of kpiLinks ?? []) {
    if (k.objective_id && objIds.has(k.objective_id) && kpiIds.has(k.id)) {
      edges.push({ source: `obj:${k.objective_id}`, target: `kpi:${k.id}` })
    }
  }
  // Edges: Control → Risk
  for (const c of riskControls ?? []) {
    if (c.risk_id && riskIds.has(c.risk_id) && ctlIds.has(c.id)) {
      edges.push({ source: `risk:${c.risk_id}`, target: `ctl:${c.id}` })
    }
  }
  // Edges: Finding → Risk
  for (const f of findings ?? []) {
    if (f.risk_id && riskIds.has(f.risk_id)) {
      edges.push({ source: `risk:${f.risk_id}`, target: `finding:${f.id}` })
    }
  }

  return { nodes, edges }
}

// ── Node positions ────────────────────────────────────────────────────────────

function computePositions(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const byLayer: GraphNode[][] = [[], [], [], [], []]
  for (const n of nodes) byLayer[n.layer]?.push(n)

  const positions = new Map<string, { x: number; y: number }>()
  for (let layer = 0; layer < 5; layer++) {
    const group = byLayer[layer] ?? []
    const cx = LAYER_X_PCT[layer] * SVG_W
    const total = group.length
    const spacing = total > 1 ? (SVG_H - 80) / (total - 1) : 0
    group.forEach((n, i) => {
      const y = total === 1 ? SVG_H / 2 : 40 + i * spacing
      positions.set(n.id, { x: cx, y })
    })
  }
  return positions
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { institutionId: string }

export function TraceabilityGraph({ institutionId }: Props) {
  const router = useRouter()
  const [graph, setGraph]     = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchGraphData(institutionId)
      setGraph(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [institutionId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
        <h2 className="text-[16px] font-semibold text-navy-900 font-body mb-3">Traceability Graph</h2>
        <div className="h-[200px] flex items-center justify-center text-[13px] text-navy-mid">
          Loading graph…
        </div>
      </div>
    )
  }

  if (error || !graph) {
    return (
      <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
        <h2 className="text-[16px] font-semibold text-navy-900 font-body mb-3">Traceability Graph</h2>
        <p className="text-[13px] text-navy-mid">Unable to load traceability data.</p>
      </div>
    )
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
        <h2 className="text-[16px] font-semibold text-navy-900 font-body mb-3">Traceability Graph</h2>
        <p className="text-[13px] text-navy-mid">No governance records to display yet.</p>
      </div>
    )
  }

  const positions = computePositions(graph.nodes)

  return (
    <div className="rounded-[10px] border border-paper-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-semibold text-navy-900 font-body">Traceability Graph</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {LAYER_LABELS.map((label, i) => (
            <span key={label} className="flex items-center gap-1 text-[11px] text-navy-mid">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: LAYER_COLORS[i] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ minWidth: 600, maxHeight: SVG_H }}
          aria-label="Governance traceability graph"
          role="img"
        >
          {/* Edges */}
          {graph.edges.map((e, i) => {
            const s = positions.get(e.source)
            const t = positions.get(e.target)
            if (!s || !t) return null
            const mx = (s.x + t.x) / 2
            return (
              <path
                key={i}
                d={`M ${s.x + NODE_W / 2} ${s.y} C ${mx} ${s.y}, ${mx} ${t.y}, ${t.x - NODE_W / 2} ${t.y}`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={1.5}
              />
            )
          })}

          {/* Nodes */}
          {graph.nodes.map((n) => {
            const pos = positions.get(n.id)
            if (!pos) return null
            const cx    = pos.x - NODE_W / 2
            const cy    = pos.y - NODE_H / 2
            const color = LAYER_COLORS[n.layer] ?? '#666'
            const label = n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label

            return (
              <g
                key={n.id}
                className="cursor-pointer"
                onClick={() => router.push(n.href)}
                role="button"
                aria-label={n.label}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && router.push(n.href)}
              >
                <rect
                  x={cx}
                  y={cy}
                  width={NODE_W}
                  height={NODE_H}
                  rx={5}
                  fill={color}
                  opacity={0.9}
                  className="hover:opacity-100 transition-opacity"
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#fff"
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
