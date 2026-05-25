// lib/analytics/anomaly.ts
// Anomaly detection: pure stat utilities + detection service.
// Pure functions (mean, stddev, isAnomaly) are imported by the cron route handler.
// sendAnomalyAlerts() uses admin client (bypasses RLS — intentional for cross-user notification lookup).
// SERVER-SIDE ONLY — never import in client components.

import { createElement } from 'react'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { insertNotification } from '@/lib/notifications/insert'
import { AnomalyAlertEmail } from '@/lib/email/templates/AnomalyAlertEmail'

/** Arithmetic mean of a numeric array. */
export function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length
}

/** Population standard deviation. Pass optional precomputed mean for efficiency. */
export function stddev(values: number[], mu?: number): number {
  const m = mu ?? mean(values)
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length)
}

/**
 * Returns true if |value - mean| > threshold * stddev.
 * GUARD: returns false if stddev === 0 (identical readings — never anomalous).
 */
export function isAnomaly(value: number, m: number, s: number, threshold = 2): boolean {
  if (s === 0) return false
  return Math.abs(value - m) > threshold * s
}

/**
 * Queries KPI and KRI readings from the last 25 hours, groups by metric,
 * computes trailing 6-period statistics, and sends anomaly alerts for metrics
 * where the latest reading deviates more than 2 standard deviations from the mean.
 *
 * Returns { sent, skipped } counts.
 */
export async function sendAnomalyAlerts(): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  let sent = 0
  let skipped = 0

  // Query KPI readings
  const { data: kpiReadings } = await admin
    .from('kpi_readings')
    .select('id, kpi_id, actual_value, recorded_at, kpis(id, title, unit_of_measure, target_value, owner_id, institution_id)')
    .gt('recorded_at', since)

  // Query KRI readings
  const { data: kriReadings } = await admin
    .from('kri_readings')
    .select('id, kri_id, actual_value, recorded_at, kri_definitions(id, title, unit, target_value, owner_id, institution_id)')
    .gt('recorded_at', since)

  type MetricGroup = {
    metricId: string
    metricTitle: string
    metricType: 'KPI' | 'KRI'
    unit: string
    targetValue: number
    ownerId: string
    institutionId: string
    readings: { actual_value: number; recorded_at: string }[]
  }

  const groups = new Map<string, MetricGroup>()

  for (const r of kpiReadings ?? []) {
    const kpi = (r as any).kpis
    if (!kpi) continue
    const key = `kpi:${r.kpi_id}`
    if (!groups.has(key)) {
      groups.set(key, {
        metricId: r.kpi_id,
        metricTitle: kpi.title,
        metricType: 'KPI',
        unit: kpi.unit_of_measure ?? '',
        targetValue: kpi.target_value,
        ownerId: kpi.owner_id,
        institutionId: kpi.institution_id,
        readings: [],
      })
    }
    groups.get(key)!.readings.push({ actual_value: r.actual_value, recorded_at: r.recorded_at })
  }

  for (const r of kriReadings ?? []) {
    const kri = (r as any).kri_definitions
    if (!kri) continue
    const key = `kri:${r.kri_id}`
    if (!groups.has(key)) {
      groups.set(key, {
        metricId: r.kri_id,
        metricTitle: kri.title,
        metricType: 'KRI',
        unit: kri.unit ?? '',
        targetValue: kri.target_value,
        ownerId: kri.owner_id,
        institutionId: kri.institution_id,
        readings: [],
      })
    }
    groups.get(key)!.readings.push({ actual_value: r.actual_value, recorded_at: r.recorded_at })
  }

  for (const [, group] of groups) {
    // Skip metrics with fewer than 3 readings in the window (Pitfall 2: no false positive alerts)
    if (group.readings.length < 3) {
      skipped++
      continue
    }

    const sorted = group.readings.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    const window = sorted.slice(-6)
    const values = window.map(r => r.actual_value)
    const m = mean(values)
    const s = stddev(values, m)
    const latest = window[window.length - 1]

    if (!isAnomaly(latest.actual_value, m, s, 2)) {
      skipped++
      continue
    }

    // Assemble recipients (user IDs for notifications, emails for Resend)
    const recipientIds = new Set<string>()
    const emailRecipients = new Set<string>()

    // Add KPI/KRI owner
    if (group.ownerId) {
      const { data: ownerUser } = await admin.auth.admin.getUserById(group.ownerId)
      if (ownerUser?.user?.id) recipientIds.add(ownerUser.user.id)
      if (ownerUser?.user?.email) emailRecipients.add(ownerUser.user.email)
    }

    // Add institution admins
    const { data: adminProfiles } = await admin
      .from('user_profiles')
      .select('id')
      .eq('institution_id', group.institutionId)
      .eq('active_role', 'admin')

    for (const p of adminProfiles ?? []) {
      recipientIds.add((p as { id: string }).id)
      const { data: u } = await admin.auth.admin.getUserById((p as { id: string }).id)
      if (u?.user?.email) emailRecipients.add(u.user.email)
    }

    const link = group.metricType === 'KPI'
      ? `/strategic/kpis/${group.metricId}`
      : `/risk/kris/${group.metricId}`

    // Insert in-app notifications for each recipient
    for (const userId of recipientIds) {
      await insertNotification({
        institutionId: group.institutionId,
        userId,
        title: `Anomaly: ${group.metricTitle} deviated >2σ`,
        body: `Actual: ${latest.actual_value} | Mean: ${m.toFixed(2)} | σ: ${s.toFixed(2)}`,
        link,
        sourceModule: 'analytics',
      })
    }

    // Send email via Resend (graceful degradation — skip if key not set or is test key)
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && resendKey !== 're_xxxx' && resendKey !== 're_test' && emailRecipients.size > 0) {
      const resend = new Resend(resendKey)
      try {
        await resend.emails.send({
          from: 'GRC-Nexus Alerts <noreply@grcnexus.gov.zw>',
          to: Array.from(emailRecipients),
          subject: `[ANOMALY] ${group.metricTitle} — Statistical Deviation Detected`,
          react: createElement(AnomalyAlertEmail, {
            metricTitle: group.metricTitle,
            metricType: group.metricType,
            actualValue: latest.actual_value,
            mean: m,
            stddev: s,
            unit: group.unit,
            period: latest.recorded_at,
            link,
            institutionName: group.institutionId,
          }),
        })
      } catch (emailErr) {
        console.error('[sendAnomalyAlerts] Email send error:', emailErr)
      }
    }

    sent++
  }

  return { sent, skipped }
}
