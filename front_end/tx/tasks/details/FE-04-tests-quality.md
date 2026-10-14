# FE-04: Add Tests and Quality Gates

Status: done

## Goal

Keep frontend changes safe before PR.

## Scope

- Model tests
- Auth tests
- App shell tests
- API boundary tests
- Main flow smoke tests

## References

- `tx/adrs/0002_teach_stack.md`
- `tx/adrs/0003_folder_structure.md`

## Acceptance

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes

## Current Evidence

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: pass
- `npm run build`: pass
