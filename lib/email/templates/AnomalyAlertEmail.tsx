// lib/email/templates/AnomalyAlertEmail.tsx
// React Email template for anomaly deviation alerts.
// SERVER-SIDE ONLY — never import in client components.
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Link,
} from '@react-email/components'

interface AnomalyAlertEmailProps {
  metricTitle: string
  metricType: 'KPI' | 'KRI'
  actualValue: number
  mean: number
  stddev: number
  unit: string
  period: string
  link: string
  institutionName: string
}

export function AnomalyAlertEmail({
  metricTitle,
  metricType,
  actualValue,
  mean,
  stddev,
  unit,
  period,
  link,
  institutionName,
}: AnomalyAlertEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body
        style={{
          backgroundColor: '#F3F7FD',
          fontFamily: 'DM Sans, Arial, sans-serif',
          margin: 0,
          padding: '40px 0',
        }}
      >
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          {/* Header */}
          <Section
            style={{
              backgroundColor: '#050D1B',
              borderRadius: '10px 10px 0 0',
              padding: '24px 32px',
            }}
          >
            <Heading
              style={{
                color: '#C8A44A',
                fontSize: 20,
                margin: 0,
                fontWeight: 600,
                fontFamily: 'Georgia, serif',
              }}
            >
              GRC-Nexus
            </Heading>
            <Text style={{ color: '#D7E2EF', fontSize: 13, margin: '4px 0 0' }}>
              Analytics Alert
            </Text>
          </Section>

          {/* Body */}
          <Section
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D7E2EF',
              borderRadius: '0 0 10px 10px',
              padding: '32px',
              borderTop: 'none',
            }}
          >
            <Heading
              as="h2"
              style={{
                color: '#0B1625',
                fontSize: 18,
                fontWeight: 600,
                marginTop: 0,
                marginBottom: 12,
              }}
            >
              Statistical Anomaly Detected
            </Heading>

            <Text style={{ color: '#3A5270', fontSize: 14, lineHeight: '1.6' }}>
              The following {metricType} has recorded a reading that deviates more than 2
              standard deviations from its trailing 6-period mean.
            </Text>

            {/* Info box */}
            <Section
              style={{
                backgroundColor: '#F3F7FD',
                border: '1px solid #D7E2EF',
                borderRadius: 8,
                padding: '16px 20px',
                margin: '16px 0',
              }}
            >
              <Text style={{ color: '#0B1625', fontSize: 13, margin: '4px 0' }}>
                <strong>Metric:</strong> {metricTitle}
              </Text>
              <Text style={{ color: '#0B1625', fontSize: 13, margin: '4px 0' }}>
                <strong>Type:</strong> {metricType}
              </Text>
              <Text style={{ color: '#0B1625', fontSize: 13, margin: '4px 0' }}>
                <strong>Period:</strong> {period}
              </Text>
              <Text style={{ color: '#0B1625', fontSize: 13, margin: '4px 0' }}>
                <strong>Actual Value:</strong> {actualValue} {unit}
              </Text>
              <Text style={{ color: '#0B1625', fontSize: 13, margin: '4px 0' }}>
                <strong>6-Period Mean:</strong> {mean.toFixed(2)} {unit}
              </Text>
              <Text style={{ color: '#0B1625', fontSize: 13, margin: '4px 0' }}>
                <strong>Standard Deviation:</strong> {stddev.toFixed(2)} {unit}
              </Text>
            </Section>

            <Link
              href={link}
              style={{
                display: 'inline-block',
                backgroundColor: '#C8A44A',
                color: '#050D1B',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                marginTop: 8,
              }}
            >
              View {metricType} Detail
            </Link>

            <Text style={{ color: '#8BA3BE', fontSize: 12, marginTop: 24 }}>
              {institutionName} — GRC-Nexus Automated Alert
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
