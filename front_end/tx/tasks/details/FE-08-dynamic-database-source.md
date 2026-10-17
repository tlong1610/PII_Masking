# FE-08 Dynamic database source

Status: done
Sprint: Post-MVP P1

## Goal

Let DPO add PostgreSQL or MongoDB source from the UI.

Historical P0 note: the MVP originally scanned the full configured demo scope. The current P1 flow includes a source scope picker and optional link-only tables. Do not make Phuc fix backend/AI work for this frontend task.

## Scope

- Add source form.
- Test connection.
- Hide password/URI after submit.
- Allow scan only after connection succeeds.
- Use the existing source scope picker when the backend exposes scope relationships; keep the fallback to the source default scope.

## Trello Checklist

- Add "Add data source" screen.
- Choose PostgreSQL or MongoDB.
- Enter host, port, database, username, password.
- Add "Test connection" action.
- Show clear connection errors.
- Allow run only after successful connection.
- Show connected source in source list.
- Never show password or connection URI after submit.
- Select dynamic source and choose the scan scope before starting the run.

## Current Boundary

This is P1 unless PM moves it back into scope.

- FE may use existing source create/test endpoints only through `realPiiReviewApi.ts`.
- FE must not change backend/AI code to make this task pass.
- Fine-grained table/collection selection is part of the current P1 flow.
- Historical P0 video should not be treated as the current scope contract.
