# Phase 8 Research: Executive Dashboard and Reporting

**Researched:** 2026-05-23
**Domain:** Consolidated governance posture, URL-persisted filters, PDF/CSV exports, audit trail visibility
**Confidence:** HIGH

## Summary

Phase 8 should compose existing module capabilities (strategic KPIs, risk heatmap, compliance posture, board actions, audit trail) into a single executive view and reporting workflow.

Existing assets already in repo:
- Protected dashboard route exists but is still placeholder content.
- Risk heatmap route exists with data query support.
- Compliance dashboard exists with posture metrics and list previews.
- Audit log page exists for admin/audit-officer with table/action/date filtering and CSV export endpoint.

Primary work in Phase 8 is integration and orchestration, not foundational schema.

## Recommended Build Order

1. Build reporting query helpers and filter contract first.
2. Replace dashboard placeholder with consolidated cards/widgets using URL-persisted filters.
3. Add governance report PDF generation endpoint and dashboard download action.
4. Extend audit trail filtering to include module/department dimensions and finish with end-to-end verification.

## Risk Controls

- Keep `export const dynamic = 'force-dynamic'` on all protected reporting pages.
- Never trust client-only visibility; enforce role checks on export/report endpoints.
- Ensure export endpoints set `Cache-Control: no-store`.
- Filter parameters must be validated (date ranges, enums) before query composition.

## Requirement Mapping

- `RPT-01`: unified dashboard composition (KPI + risk + compliance + overdue actions)
- `RPT-02`: persistent filters in URL (time period, department, module)
- `RPT-03`: downloadable governance summary PDF
- `RPT-04`: filterable audit trail with export
