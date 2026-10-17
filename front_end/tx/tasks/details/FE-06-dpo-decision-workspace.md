# FE-06 DPO decision workspace

Status: done
Sprint: Sprint 03

## Goal

Make DPO review easier than a long field table.

## Reference UX

- Immuta-style policy builder: grouped decisions, bulk apply, build readiness.
- BigID-style discovery: classify by PII type/risk with clear suggested action.

## Scope

- Group fields by classification/risk.
- Add action filters and bulk action.
- Show decision summary panel.
- Keep real API flow: decisions -> build -> publish.

## Acceptance

- DPO can review large scans without reading every row top-to-bottom.
- MASK/HMAC/DROP/KEEP are visible and editable per field.
- Summary clearly shows total decisions and build readiness.
- No raw PII sample is shown.

## Evidence

- Built DPO policy workspace in FE.
- Ran typecheck, lint, tests, and build.
- Smoke tested local DPO scan with real API.
