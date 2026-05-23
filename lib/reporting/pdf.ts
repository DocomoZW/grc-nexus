import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { ExecutiveDashboardData } from './types'

function drawLine(text: string, y: number, fontSize = 11) {
  return { text, y, fontSize }
}

export async function buildGovernanceSummaryPdf(data: ExecutiveDashboardData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([842, 595])
  const { height } = page.getSize()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  page.drawText('GRC-Nexus Governance Summary', {
    x: 40,
    y: height - 40,
    size: 18,
    font: bold,
    color: rgb(0.08, 0.14, 0.24),
  })

  page.drawText(`Scope: ${data.filters.from} to ${data.filters.to} | Module: ${data.filters.module}`, {
    x: 40,
    y: height - 62,
    size: 10,
    font,
    color: rgb(0.3, 0.35, 0.4),
  })

  if (data.filters.department) {
    page.drawText(`Department: ${data.filters.department}`, {
      x: 40,
      y: height - 76,
      size: 10,
      font,
      color: rgb(0.3, 0.35, 0.4),
    })
  }

  let y = height - 110
  page.drawText('Executive KPI Summary', { x: 40, y, size: 13, font: bold })
  y -= 20

  const kpiLines = [
    `Objectives in scope: ${data.kpi.objectivesTotal}`,
    `Active risks: ${data.kpi.activeRisks}`,
    `Overdue obligations: ${data.kpi.overdueObligations}`,
    `Open incidents: ${data.kpi.openIncidents}`,
  ]

  for (const line of kpiLines) {
    const row = drawLine(line, y)
    page.drawText(row.text, { x: 56, y: row.y, size: row.fontSize, font })
    y -= 15
  }

  y -= 10
  page.drawText('Risk and Compliance', { x: 40, y, size: 13, font: bold })
  y -= 20
  page.drawText(`Risk heatmap points: ${data.riskHeatmapPoints.length}`, { x: 56, y, size: 11, font })
  y -= 15
  page.drawText(`Compliance obligations: ${data.compliance.totalObligations}`, { x: 56, y, size: 11, font })
  y -= 15
  page.drawText(`Compliance overdue: ${data.compliance.overdueCount}`, { x: 56, y, size: 11, font })
  y -= 15
  page.drawText(`Compliance due soon: ${data.compliance.expiringCount}`, { x: 56, y, size: 11, font })

  y -= 26
  page.drawText('Top Overdue Actions', { x: 40, y, size: 13, font: bold })
  y -= 18

  if (data.overdueActions.length === 0) {
    page.drawText('No overdue actions in current scope.', { x: 56, y, size: 11, font })
  } else {
    for (const action of data.overdueActions.slice(0, 10)) {
      if (y < 40) break
      const line = `[${action.module}] ${action.title} | due ${action.dueDate} | ${action.status}`
      page.drawText(line, { x: 56, y, size: 10, font })
      y -= 13
    }
  }

  return await pdf.save()
}
