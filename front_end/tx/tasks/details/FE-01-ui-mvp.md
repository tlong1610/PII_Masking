# FE-01: Build UI MVP Screens

Status: done

## Goal

Create usable DPO and Analyst frontend screens for the dataset review workflow.

## Scope

- Login role screen
- DPO source, scan, review, build confirm, verifier result
- Publish/revoke UI
- Analyst dataset and processed preview
- Loading, empty, error states

## References

- `tx/specs/product.md`
- `tx/specs/flows.md`
- `tx/specs/roles.md`
- `tx/adrs/0001_architecture_style.md`

## Acceptance

- Routes work: `/login`, `/dpo`, `/analyst`
- UI does not render raw PII
- Typecheck, lint, tests, and build pass
