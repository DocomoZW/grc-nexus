-- Migration: 20260525100001_analytics_demo_seed.sql
-- Demo seed: KPIs, KRIs, ESG metrics with readings to exercise Phase 14 analytics.
--
-- Forecasting: all metrics have ≥ 6 readings → ForecastChart renders on detail pages.
-- Anomaly detection: KPI-2 and KRI-2 have a latest reading >2σ from 6-period mean,
--   AND all their readings are within the last 25 hours so the cron route detects them.
--
-- Admin user: admin@grcnexus.gov.zw / Admin@GRC2026! (from seed 000006)
-- Institution: Ministry of Finance (id 00000000-0000-0000-0000-000000000010)

BEGIN;

DO $$
DECLARE
  v_admin_id  uuid := '00000000-0000-0000-0000-000000000001';
  v_inst_id   uuid := '00000000-0000-0000-0000-000000000010';

  -- Strategic objective
  v_obj_id    uuid := '00000000-0000-0000-0001-000000000001';

  -- KPIs
  v_kpi1_id   uuid := '00000000-0000-0000-0002-000000000001'; -- Revenue Collection Rate (steady growth)
  v_kpi2_id   uuid := '00000000-0000-0000-0002-000000000002'; -- Staff Training Completion (ANOMALY)
  v_kpi3_id   uuid := '00000000-0000-0000-0002-000000000003'; -- Budget Utilisation Rate (seasonal)

  -- KRIs
  v_kri1_id   uuid := '00000000-0000-0000-0003-000000000001'; -- Audit Finding Rate (stable)
  v_kri2_id   uuid := '00000000-0000-0000-0003-000000000002'; -- Data Breach Incidents (ANOMALY)
  v_kri3_id   uuid := '00000000-0000-0000-0003-000000000003'; -- Regulatory Compliance Score (improving)

  -- ESG metrics
  v_esg1_id   uuid := '00000000-0000-0000-0004-000000000001'; -- Carbon Emissions (tCO2e)
  v_esg2_id   uuid := '00000000-0000-0000-0004-000000000002'; -- Female Leadership (%)

BEGIN

  -- ─────────────────────────────────────────────────────────────
  -- Strategic Objective (parent for KPIs)
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.strategic_objectives
    (id, institution_id, title, description, owner_id, start_date, target_date, status, nds2_pillar, created_by)
  VALUES (
    v_obj_id, v_inst_id,
    'Strengthen Public Financial Management',
    'Improve revenue collection, budget utilisation, and workforce capacity across the ministry.',
    v_admin_id,
    '2025-01-01', '2026-12-31',
    'active',
    'governance_and_institutions',
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;


  -- ─────────────────────────────────────────────────────────────
  -- KPI 1: Revenue Collection Rate — steady upward trend
  -- Forecast: slope ~+2%/quarter, band will show continued growth
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.kpis
    (id, institution_id, objective_id, title, description, owner_id, baseline_value, target_value, unit_of_measure, reporting_frequency, created_by)
  VALUES (
    v_kpi1_id, v_inst_id, v_obj_id,
    'Revenue Collection Rate',
    'Percentage of projected revenue actually collected in the reporting period.',
    v_admin_id, 70, 90, '%', 'quarterly', v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kpi_readings (institution_id, kpi_id, reporting_period, actual_value, notes, recorded_by, recorded_at)
  VALUES
    (v_inst_id, v_kpi1_id, 'Q1 2025', 72,   'First quarter — below target but improving.',       v_admin_id, now() - interval '450 days'),
    (v_inst_id, v_kpi1_id, 'Q2 2025', 74,   'Improved collection efficiency.',                   v_admin_id, now() - interval '360 days'),
    (v_inst_id, v_kpi1_id, 'Q3 2025', 77,   'New billing system partially deployed.',            v_admin_id, now() - interval '270 days'),
    (v_inst_id, v_kpi1_id, 'Q4 2025', 80,   'Year-end push brought significant collections.',   v_admin_id, now() - interval '180 days'),
    (v_inst_id, v_kpi1_id, 'Q1 2026', 82,   'System now fully operational.',                    v_admin_id, now() - interval '90 days'),
    (v_inst_id, v_kpi1_id, 'Q2 2026', 85,   'Strong Q2 driven by compliance incentives.',       v_admin_id, now() - interval '5 days')
  ON CONFLICT DO NOTHING;


  -- ─────────────────────────────────────────────────────────────
  -- KPI 2: Staff Training Completion — ANOMALY in latest reading
  -- 5 readings ~83-85%, then last reading drops to 14% (critical incident)
  -- All readings within last 24h so anomaly-detect cron fires today.
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.kpis
    (id, institution_id, objective_id, title, description, owner_id, baseline_value, target_value, unit_of_measure, reporting_frequency, created_by)
  VALUES (
    v_kpi2_id, v_inst_id, v_obj_id,
    'Staff Training Completion Rate',
    'Percentage of required training modules completed by ministry staff within the period.',
    v_admin_id, 60, 95, '%', 'quarterly', v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kpi_readings (institution_id, kpi_id, reporting_period, actual_value, notes, recorded_by, recorded_at)
  VALUES
    (v_inst_id, v_kpi2_id, 'Q1 2025', 85, 'Strong start — mandatory courses enforced.',         v_admin_id, now() - interval '22 hours'),
    (v_inst_id, v_kpi2_id, 'Q2 2025', 83, 'Slight dip due to mid-year budget freeze.',          v_admin_id, now() - interval '20 hours'),
    (v_inst_id, v_kpi2_id, 'Q3 2025', 84, 'Recovery after freeze lifted.',                      v_admin_id, now() - interval '18 hours'),
    (v_inst_id, v_kpi2_id, 'Q4 2025', 85, 'End-of-year compliance push successful.',            v_admin_id, now() - interval '16 hours'),
    (v_inst_id, v_kpi2_id, 'Q1 2026', 83, 'Consistent — training calendar running on track.',   v_admin_id, now() - interval '14 hours'),
    -- ANOMALY: LMS system outage caused near-total failure of completion tracking
    (v_inst_id, v_kpi2_id, 'Q2 2026', 14, 'ALERT: LMS outage for 6 weeks — completions unrecorded. Urgent investigation required.', v_admin_id, now() - interval '30 minutes')
  ON CONFLICT DO NOTHING;


  -- ─────────────────────────────────────────────────────────────
  -- KPI 3: Budget Utilisation Rate — seasonal wave pattern
  -- Forecast: slight upward trend, moderate uncertainty band
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.kpis
    (id, institution_id, objective_id, title, description, owner_id, baseline_value, target_value, unit_of_measure, reporting_frequency, created_by)
  VALUES (
    v_kpi3_id, v_inst_id, v_obj_id,
    'Budget Utilisation Rate',
    'Percentage of approved budget actually disbursed and utilised within the fiscal period.',
    v_admin_id, 65, 88, '%', 'quarterly', v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kpi_readings (institution_id, kpi_id, reporting_period, actual_value, notes, recorded_by, recorded_at)
  VALUES
    (v_inst_id, v_kpi3_id, 'Q1 2025', 68, 'Slow Q1 disbursements — procurement delays.',       v_admin_id, now() - interval '400 days'),
    (v_inst_id, v_kpi3_id, 'Q2 2025', 73, 'Mid-year acceleration as projects launched.',       v_admin_id, now() - interval '310 days'),
    (v_inst_id, v_kpi3_id, 'Q3 2025', 78, 'Capital projects commenced.',                       v_admin_id, now() - interval '220 days'),
    (v_inst_id, v_kpi3_id, 'Q4 2025', 85, 'Year-end surge in recurrent expenditure.',          v_admin_id, now() - interval '130 days'),
    (v_inst_id, v_kpi3_id, 'Q1 2026', 70, 'Typical slow Q1 — new budget cycle beginning.',    v_admin_id, now() - interval '40 days'),
    (v_inst_id, v_kpi3_id, 'Q2 2026', 76, 'Procurement framework improvements taking effect.', v_admin_id, now() - interval '3 days')
  ON CONFLICT DO NOTHING;


  -- ─────────────────────────────────────────────────────────────
  -- KRI 1: Audit Finding Rate — stable, on track
  -- Forecast: flat trend, tight uncertainty band
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.kri_definitions
    (id, institution_id, title, description, unit_of_measure, target_value, alert_threshold, direction, owner_id, reporting_frequency, created_by)
  VALUES (
    v_kri1_id, v_inst_id,
    'Audit Finding Rate',
    'Number of significant findings raised per internal audit engagement.',
    'findings per engagement', 5, 10,
    'lower_is_worse',
    v_admin_id, 'quarterly', v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kri_readings (institution_id, kri_id, period_start, period_end, actual_value, status, notes, recorded_by, recorded_at)
  VALUES
    (v_inst_id, v_kri1_id, '2025-01-01','2025-03-31', 8,  'at_risk',  'Above target — control weaknesses in procurement.',   v_admin_id, now() - interval '430 days'),
    (v_inst_id, v_kri1_id, '2025-04-01','2025-06-30', 6,  'at_risk',  'Improving following internal review.',                v_admin_id, now() - interval '340 days'),
    (v_inst_id, v_kri1_id, '2025-07-01','2025-09-30', 5,  'on_track', 'Hit target — new control framework effective.',       v_admin_id, now() - interval '250 days'),
    (v_inst_id, v_kri1_id, '2025-10-01','2025-12-31', 4,  'on_track', 'Best performance to date.',                          v_admin_id, now() - interval '160 days'),
    (v_inst_id, v_kri1_id, '2026-01-01','2026-03-31', 5,  'on_track', 'Steady — framework holding.',                        v_admin_id, now() - interval '70 days'),
    (v_inst_id, v_kri1_id, '2026-04-01','2026-06-30', 6,  'at_risk',  'Minor uptick — two IT audit findings.',              v_admin_id, now() - interval '4 days')
  ON CONFLICT DO NOTHING;


  -- ─────────────────────────────────────────────────────────────
  -- KRI 2: Data Breach Incidents — ANOMALY in latest reading
  -- 5 readings 0-2 incidents, latest jumps to 47 (critical security event)
  -- All within last 24h so anomaly cron fires today.
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.kri_definitions
    (id, institution_id, title, description, unit_of_measure, target_value, alert_threshold, direction, owner_id, reporting_frequency, created_by)
  VALUES (
    v_kri2_id, v_inst_id,
    'Data Breach Incidents',
    'Number of confirmed data security incidents affecting ministry systems or data assets.',
    'incidents', 0, 3,
    'lower_is_worse',
    v_admin_id, 'quarterly', v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kri_readings (institution_id, kri_id, period_start, period_end, actual_value, status, notes, recorded_by, recorded_at)
  VALUES
    (v_inst_id, v_kri2_id, '2025-01-01','2025-03-31', 1,  'on_track', 'One phishing attempt intercepted.',                  v_admin_id, now() - interval '23 hours'),
    (v_inst_id, v_kri2_id, '2025-04-01','2025-06-30', 0,  'on_track', 'Clean quarter — no incidents.',                     v_admin_id, now() - interval '21 hours'),
    (v_inst_id, v_kri2_id, '2025-07-01','2025-09-30', 2,  'at_risk',  'Two incidents — both low severity, contained.',     v_admin_id, now() - interval '19 hours'),
    (v_inst_id, v_kri2_id, '2025-10-01','2025-12-31', 1,  'on_track', 'Improved after security awareness training.',       v_admin_id, now() - interval '17 hours'),
    (v_inst_id, v_kri2_id, '2026-01-01','2026-03-31', 0,  'on_track', 'Zero incidents — controls effective.',              v_admin_id, now() - interval '15 hours'),
    -- ANOMALY: Ransomware attack — 47 systems affected
    (v_inst_id, v_kri2_id, '2026-04-01','2026-06-30', 47, 'breached', 'CRITICAL: Ransomware attack detected. 47 endpoints compromised. Incident response activated.', v_admin_id, now() - interval '1 hour')
  ON CONFLICT DO NOTHING;


  -- ─────────────────────────────────────────────────────────────
  -- KRI 3: Regulatory Compliance Score — improving trend
  -- Forecast: positive slope, band shows continued improvement
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.kri_definitions
    (id, institution_id, title, description, unit_of_measure, target_value, alert_threshold, direction, owner_id, reporting_frequency, created_by)
  VALUES (
    v_kri3_id, v_inst_id,
    'Regulatory Compliance Score',
    'Composite score from external regulator assessments across all statutory obligations.',
    'score (0-100)', 80, 65,
    'higher_is_worse',
    v_admin_id, 'semi_annual', v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kri_readings (institution_id, kri_id, period_start, period_end, actual_value, status, notes, recorded_by, recorded_at)
  VALUES
    (v_inst_id, v_kri3_id, '2024-01-01','2024-06-30', 68, 'at_risk',  'Below target — gaps in documentation.',            v_admin_id, now() - interval '500 days'),
    (v_inst_id, v_kri3_id, '2024-07-01','2024-12-31', 71, 'at_risk',  'Improvement — remediation plan implemented.',      v_admin_id, now() - interval '380 days'),
    (v_inst_id, v_kri3_id, '2025-01-01','2025-06-30', 75, 'at_risk',  'Stronger evidence management framework.',          v_admin_id, now() - interval '260 days'),
    (v_inst_id, v_kri3_id, '2025-07-01','2025-12-31', 79, 'on_track', 'Near target — almost full compliance.',            v_admin_id, now() - interval '140 days'),
    (v_inst_id, v_kri3_id, '2026-01-01','2026-03-31', 82, 'on_track', 'Exceeded target for first time.',                  v_admin_id, now() - interval '55 days'),
    (v_inst_id, v_kri3_id, '2026-04-01','2026-06-30', 84, 'on_track', 'Sustained improvement — new compliance team.',     v_admin_id, now() - interval '6 days')
  ON CONFLICT DO NOTHING;


  -- ─────────────────────────────────────────────────────────────
  -- ESG Metric 1: Scope 1 Carbon Emissions — declining (good)
  -- Forecast: negative slope, band shows further reduction
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.esg_metrics
    (id, institution_id, metric_code, name, category, unit, target_value, description, created_by)
  VALUES (
    v_esg1_id, v_inst_id,
    'ENV-01',
    'Scope 1 Carbon Emissions',
    'Environmental',
    'tCO2e',
    400,
    'Direct greenhouse gas emissions from ministry-owned or controlled sources.',
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.esg_readings (institution_id, metric_id, period_label, actual_value, notes, recorded_by)
  VALUES
    (v_inst_id, v_esg1_id, 'FY2023 Q1', 620, 'Baseline — diesel generators primary power source.',  v_admin_id),
    (v_inst_id, v_esg1_id, 'FY2023 Q2', 595, 'Generator usage reduced by 10% due to solar install.', v_admin_id),
    (v_inst_id, v_esg1_id, 'FY2023 Q3', 570, 'Solar panels commissioned — 30% reduction in diesel.', v_admin_id),
    (v_inst_id, v_esg1_id, 'FY2023 Q4', 540, 'Grid stability improved; generator backup less used.',  v_admin_id),
    (v_inst_id, v_esg1_id, 'FY2024 Q1', 510, 'Fleet electrification programme launched.',            v_admin_id),
    (v_inst_id, v_esg1_id, 'FY2024 Q2', 480, 'Five ICE vehicles replaced with EVs.',                v_admin_id)
  ON CONFLICT DO NOTHING;


  -- ─────────────────────────────────────────────────────────────
  -- ESG Metric 2: Women in Senior Leadership — improving
  -- Forecast: slope ~+0.8pp/quarter, band shows nearing 50% target
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO public.esg_metrics
    (id, institution_id, metric_code, name, category, unit, target_value, description, created_by)
  VALUES (
    v_esg2_id, v_inst_id,
    'SOC-01',
    'Women in Senior Leadership',
    'Social',
    '%',
    50,
    'Percentage of senior management and director-level positions held by women.',
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.esg_readings (institution_id, metric_id, period_label, actual_value, notes, recorded_by)
  VALUES
    (v_inst_id, v_esg2_id, 'FY2023 Q1', 32, 'Baseline — historical under-representation.',          v_admin_id),
    (v_inst_id, v_esg2_id, 'FY2023 Q2', 33, 'Two senior appointments — both women.',               v_admin_id),
    (v_inst_id, v_esg2_id, 'FY2023 Q3', 35, 'Gender equity policy adopted by Cabinet.',            v_admin_id),
    (v_inst_id, v_esg2_id, 'FY2023 Q4', 37, 'Targeted recruitment drive concluded.',               v_admin_id),
    (v_inst_id, v_esg2_id, 'FY2024 Q1', 39, 'Mentorship programme producing pipeline candidates.', v_admin_id),
    (v_inst_id, v_esg2_id, 'FY2024 Q2', 41, 'Three director promotions — all internal pipeline.',  v_admin_id)
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;
