# Sprint 02: API Integration

Goal: replace demo data with backend API calls.

Dependency: final E2E sign-off waits for BE card `[P0][LONG] Hoàn thiện Backend API thật, bỏ stub`.

Scope:

- Auth/session API
- Source and scan APIs
- Review/build/report APIs
- Publish/revoke APIs
- Analyst dataset API
- MVP scan starts after source selection; table/collection picker was not required in this sprint. The current P1 flow has a scope picker; see [BA acceptance](../../specs/ba_acceptance.md).

Acceptance:

- Frontend uses `realPiiReviewApi`
- API responses are Zod-validated
- Typecheck, lint, tests, and build pass
- Local E2E passes against `http://localhost:8000/api/v1`
- DPO can start scan without choosing individual tables/collections (Sprint 02 acceptance; current P1 flow differs)
