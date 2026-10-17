# FE-02: Connect Real Backend APIs

Status: done

## Goal

Use backend APIs as the main data source for the PIIGuard workflow.

Real API integration for the current demo-source flow is complete. Dynamic source creation is tracked separately in FE-08.

## Scope

- Source list
- Scan/review run detail
- Build snapshot
- Verifier report
- Publish/revoke
- Analyst dataset

## Backend Contract

- API root: `http://localhost:8000/api/v1`
- Auth: `POST /sessions`, `GET /me`
- DPO: `GET /sources`, `POST /runs`, `GET /runs/{id}`, `PUT /runs/{id}/decisions`, `POST /runs/{id}/approve`, `POST /runs/{id}/build`
- Dataset: `GET /datasets`, `POST /datasets/{id}/publish`, `POST /datasets/{id}/revoke`, `GET /datasets/{id}/preview`

## References

- `tx/specs/api.md`
- `tx/specs/flows.md`
- `tx/adrs/0003_folder_structure.md`

## Acceptance

- Feature hooks call `realPiiReviewApi`
- Responses are Zod-validated
- Mock/demo fallback is local-dev only, never the main integration path
- E2E with BE local passes: DPO login -> source -> run -> decisions -> build -> publish; Analyst login -> list -> preview

## Current Evidence

- Real API Trello card completed and moved to Done.
- Backend demo-source E2E evidence exists for PostgreSQL and MongoDB.
- FE dynamic source flow is not part of this task; see FE-08.
