# API Spec

Frontend data access must go through feature `api/` modules and TanStack Query hooks.

Current integration file: `src/features/piiReview/api/realPiiReviewApi.ts`.

API root should come from environment config. Local fallback is `http://localhost:8001/api/v1`.

## Required Endpoints

### Auth/session

- `POST /sessions`
- `GET /me`

Use these for real login/session state when backend is ready. Frontend route guards are for UX only; backend remains the source of truth for permissions.

### Sources

- `GET /sources`
- `GET /sources/{id}/scope`

`GET /sources` returns safe source cards only:

- `id`
- `name`
- `source_type`: `SQL` or `NOSQL`
- `engine`
- `description`
- `scope_summary`
- `status`

It must not return database URI, username, password, token, or raw sample data.

`GET /sources/{id}/scope` returns a safe read-only scope summary:

- `source_id`
- `source_type`
- `engine`
- `items[]`
  - `name`
  - `kind`
  - `field_count`
  - `row_count` or `document_count`

### Runs

- `POST /runs`
- `GET /runs`
- `GET /runs/{id}`
- `PUT /runs/{id}/decisions`
- `POST /runs/{id}/build`

`POST /runs` body:

```json
{
  "source_id": "sql-demo"
}
```

MVP frontend does not require manual `selected_scope` selection. Backend scans the full configured demo scope for the source. If the backend still accepts `selected_scope` for compatibility, the frontend may omit it or send the full scope automatically. Fine-grained table/collection selection is P1.

`GET /runs/{id}` returns field profiles. A field profile must contain enough metadata for DPO review, but no raw PII:

- `id`
- `source_path`
- `field_path`
- `data_type`
- `profile_summary`
- `classification`
- `taxonomy_id`
- `detector_source`
- `coverage_status`
- `recommended_action`

`PUT /runs/{id}/decisions` body:

```json
{
  "decisions": [
    {
      "field_profile_id": 1,
      "action": "HMAC",
      "reason": "Join key must stay matchable without exposing raw value"
    }
  ]
}
```

`POST /runs/{id}/build` returns the updated run, created dataset, and verifier results.

### Datasets

- `GET /datasets`
- `GET /datasets?status=PUBLISHED`
- `GET /datasets/{id}/preview`
- `POST /datasets/{id}/publish`
- `POST /datasets/{id}/revoke`

Analyst views should request only `PUBLISHED` datasets.

Preview rows must be protected output only. Dropped fields should appear as metadata or be absent from rows; raw dropped values must never appear.

## Frontend Validation

- Validate all responses with Zod at the API boundary.
- Treat schema mismatch as an integration error and show a safe error state.
- Keep mock/demo fallback separate from real API integration. Mock fallback can help local UI work but cannot be used as evidence that the API integration is done.

## Security Constraints

- Do not send raw PII to browser logs.
- Do not render raw PII in UI.
- Do not store raw PII in local storage/session storage.
- Do not expose database connection strings in API responses.
- Do not allow Analyst endpoints to read staging or failed datasets.
- Do not rely on frontend-only role checks for security.

## Error Handling Contract

Frontend should handle these backend outcomes:

- `401`: user is not logged in.
- `403`: role is not allowed.
- `404`: run/source/dataset does not exist.
- `409`: state transition is not allowed.
- `422`: request is structurally valid but violates product rules, for example unsupported source or mismatched join-key actions.
- `500`: backend failed unexpectedly.
