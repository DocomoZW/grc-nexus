export type ReportingModule =
  | 'all'
  | 'strategic'
  | 'risk'
  | 'compliance'
  | 'board'
  | 'incidents'
  | 'audit'

export interface ReportingFilters {
  from: string
  to: string
  department: string | null
  module: ReportingModule
}

export interface ExecutiveKpiSummary {
  objectivesTotal: number
  activeRisks: number
  overdueObligations: number
  openIncidents: number
}

export interface OverdueActionItem {
  id: string
  title: string
  module: Exclude<ReportingModule, 'all'>
  dueDate: string
  ownerId: string | null
  status: string
}

export interface ExecutiveDashboardData {
  filters: ReportingFilters
  kpi: ExecutiveKpiSummary
  riskHeatmapPoints: Array<{
    id: string
    title: string
    likelihood: number
    impact: number
  }>
  compliance: {
    totalObligations: number
    overdueCount: number
    expiringCount: number
  }
  overdueActions: OverdueActionItem[]
}
