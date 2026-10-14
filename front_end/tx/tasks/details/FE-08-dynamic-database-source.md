# FE-08 Dynamic database source

Status: done
Sprint: Post-MVP P1

## Goal

Let DPO add PostgreSQL or MongoDB source from the UI.

P0 note: this is not required for the current MVP demo. Current MVP uses source selection and scans the full configured demo scope. Do not make Phuc fix backend/AI work for this task.

## Scope

- Add source form.
- Test connection.
- Hide password/URI after submit.
- Allow scan only after connection succeeds.
- Do not add table/collection picker in this task. Fine-grained scan scope selection is a later P1/P2 feature.

## Trello Checklist

- Add "Add data source" screen.
- Choose PostgreSQL or MongoDB.
- Enter host, port, database, username, password.
- Add "Test connection" action.
- Show clear connection errors.
- Allow run only after successful connection.
- Show connected source in source list.
- Never show password or connection URI after submit.
- Select dynamic source to start full configured scope scan.

## Current Boundary

This is P1 unless PM moves it back into scope.

- FE may use existing source create/test endpoints only through `realPiiReviewApi.ts`.
- FE must not change backend/AI code to make this task pass.
- Fine-grained table/collection picker stays out of P0.
- P0 video should not depend on this task.
