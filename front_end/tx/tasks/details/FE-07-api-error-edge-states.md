# FE-07 API error and edge states

Status: done
Sprint: Sprint 03

## Goal

Make FE API failures visible and recoverable.

## Scope

- Show DPO errors for scan, decisions, build, publish.
- Show API/query errors instead of silent blank states.
- Surface 422/403/network messages clearly.
- Keep no raw PII in error UI.

## Acceptance

- DPO sees backend 422 build errors.
- DPO/Analyst sees permission or network errors.
- User can retry or reset the current action.

## Evidence

- Added shared API error formatter.
- Replaced DPO alert popups with inline error states.
- Added Analyst dataset/preview retry error states.
- Added FE quick start README.
- Ran typecheck, lint, tests, and build.
