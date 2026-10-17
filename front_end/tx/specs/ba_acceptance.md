# BA Acceptance Spec

This file is the business acceptance layer for the MVP. It explains what must be true from a user and demo perspective, independent of implementation details.

## MVP Business Rule

P0 scans the full configured demo scope for the selected source.

The DPO does not choose individual tables or collections in P0. Table/collection selection is a P1 feature.

## Primary User Flow

1. DPO logs in.
2. DPO chooses one available source: PostgreSQL or MongoDB.
3. System shows a safe scope summary for that source.
4. DPO starts scan.
5. System scans the full configured demo scope.
6. System shows field profiles and action proposals.
7. DPO reviews and saves decisions.
8. DPO builds protected snapshot.
9. System runs verifier.
10. DPO publishes only if verifier passes.
11. Analyst opens the published dataset preview.

## Acceptance Scenarios

### A01 - DPO can start scan without table selection

Given DPO selected a ready source,
when DPO clicks scan,
then frontend calls `POST /runs` with the selected `source_id`,
and DPO is not required to tick any table or collection.

Pass if scan starts after source selection.

Fail if scan button is blocked because no table/collection was selected.

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

## Out Of Scope For P0

- Table/collection picker before scan.
- Column/path picker before scan.
- Arbitrary SQL query input.
- Uploading database files.
- Production-grade connector management.
- OCR/image/voice detection.
