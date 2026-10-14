# FE-09 Runtime evidence and video demo

Status: ready
Sprint: Gate 2

## Goal

Run the demo flow and collect sanitized evidence for Phuc's video.

## Scope

- Start backend and frontend from documented commands.
- Login as DPO.
- Choose PostgreSQL or MongoDB source.
- Scan scope using the table picker (Long has implemented `selected_scope`).
- Review decisions, build, verifier, publish.
- Login as Analyst and preview published protected dataset.
- Save only sanitized evidence; no raw PII, DB URI, password, or API key.

## Boundary

- Do not fix backend/API/AI in this task.
- If detector/golden output is wrong, point to Tùng/Kiên cards.

## Acceptance

- Evidence shows each step PASS/FAIL with timestamp and commit SHA.
- Video can be recorded in under 3 minutes.
- README is updated only if demo commands changed.
