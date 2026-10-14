# FE-03: Harden Auth Session Flow

Status: done

## Goal

Make DPO and Analyst role access explicit and safe.

## Scope

- Login API call
- Session storage
- Role-aware routes
- Logout
- Access denied state

## References

- `tx/specs/roles.md`
- `tx/specs/api.md`

## Acceptance

- Analyst cannot open DPO-only UI by direct route
- DPO-only actions require DPO session
- No role is trusted from client-only input

## Done

- Added role route guard for DPO and Analyst pages.
- Revalidates stored session with `GET /me`.
- Clears session on API 401.
- Added tests for route guard and stored-role validation.
