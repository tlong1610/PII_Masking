# BA Acceptance Spec

This file is the business acceptance layer for the MVP. It explains what must be true from a user and demo perspective, independent of implementation details.

## Current P1 Business Rule

P1 allows the DPO to inspect the source scope and choose tables/collections before scanning. If no explicit scope is selected, the backend uses the source default scope.

## Primary User Flow

1. DPO logs in.
2. DPO chooses one available source: PostgreSQL or MongoDB.
3. System shows a safe scope summary and relationship diagram.
4. DPO chooses tables/collections and optional link-only tables.
5. DPO starts scan.
6. System scans only the selected scope.
7. System shows field profiles and action proposals.
8. DPO reviews and saves decisions.
9. DPO builds protected snapshot.
10. System runs verifier.
11. DPO publishes only if verifier passes.
12. Analyst opens the published dataset preview.

## Acceptance Scenarios

### A01 - DPO can select a safe scan scope

Given DPO selected a ready source,
when DPO selects tables/collections and clicks scan,
then frontend calls `POST /runs` with `source_id`, `selected_scope`, and optional `link_scope`.

Pass if the scan starts for the selected scope and warns about cut relationships.

Fail if the UI claims to scan a table/collection that is not in the request.

### A02 - Frontend shows safe source scope summary

Given backend returns a source scope,
when DPO opens the source,
then frontend may show table/collection names and counts as read-only scope summary,
and frontend must not show raw sample values.

Pass if the UI explains what will be scanned.

Fail if raw PII, credentials, or raw samples appear.

### A03 - DPO can review every returned field profile

Given a run is `REVIEW_REQUIRED`,
when field profiles are returned,
then frontend groups them by source path and shows field path, type, classification, recommendation, reason/profile summary, and action.

Pass if every field has an action proposal.

Fail if fields appear without enough review information.

### A04 - DPO decisions gate build

Given DPO is reviewing fields,
when DPO saves decisions,
then frontend uses `PUT /runs/{id}/decisions`,
and build is allowed only when backend accepts the decision state.

Pass if invalid build attempts are blocked with a clear error.

Fail if frontend silently proceeds after backend rejects the state.

### A05 - Publish requires verifier pass

Given a protected snapshot has been built,
when verifier returns `VERIFIED`,
then DPO can publish.

Given verifier returns `FAILED`,
then publish remains blocked and the UI shows why.

Pass if only verified datasets can be published.

Fail if a failed or staging dataset can be published.

### A06 - Analyst only sees published protected data

Given Analyst logs in,
when Analyst opens datasets,
then Analyst sees only `PUBLISHED` datasets and protected preview rows.

Pass if Analyst cannot access source, scan, decisions, staging, failed, or raw data.

Fail if Analyst can access DPO-only screens or raw PII.

## Evidence Needed For Gate 2

- Screenshot or video of DPO selecting a source and starting scan without table selection.
- Screenshot or video of field profiles with action proposals.
- Screenshot or video of verifier result.
- Screenshot or video of Analyst published preview.
- Evidence that no raw PII/credential appears in UI output.

## Out Of Scope For P1

- Arbitrary SQL query input.
- Uploading database files.
- Production-grade connector management.
- OCR/image/voice detection.
