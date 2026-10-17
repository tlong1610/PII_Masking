# Roles Spec

## Shared Rule

The intended policy is Zero Raw-PII access for both roles. DPO reviews field metadata, data shape, statistics, detector evidence and protected preview; the source value is not rendered in the review workspace. **Known implementation gap:** an approved PII `KEEP` exception can copy the original value to a published snapshot and expose it to an authorized Analyst. Do not present the intended policy as an unconditional guarantee until this path is closed.

## DPO

DPO means Data Protection Officer: the reviewer responsible for approving how personal data is handled before a protected dataset is released.

### DPO can

- View configured sources (PostgreSQL & MongoDB Cloud).
- View safe source scope summary and visual diagrams.
- Start a scan over the configured scope.
- Review field profiles, sanitized detector evidence and protected preview in the secure review drawer to verify UNKNOWN/PII fields.
- See classification, recommended action, reason, detector source, and `profile_summary`.
- Override recommended action with `MASK`, `HMAC`, `DROP`, or `KEEP` (requiring `exceptionUntil` date for temporary exceptions).
- Save decisions and review Merkle Root SHA-256 audit ledger.
- Build protected snapshot after decisions are complete.
- View verifier result.
- Publish a verified dataset to Analyst.
- Revoke a published dataset immediately if compromised or expired.

### DPO cannot

- View or expose database connection credentials, secrets, or plain-text URIs.
- Publish a dataset that is not `VERIFIED` by downstream verifiers.
- Bypass backend state checks from the frontend.
- Export or leak raw PII outside the secured review context.

## Analyst

Analyst is the downstream user who consumes approved protected data for analysis, reporting, or AI experiments.

### Analyst can

- View published dataset list.
- Open protected preview rows.
- See output columns and transform labels.
- See safe aggregate or relationship evidence if backend provides it.

### Analyst cannot

- View sources.
- Start scans.
- Review DPO decisions.
- Access staging datasets.
- Access failed datasets.
- Publish or revoke datasets.
- See raw PII.

## Role Acceptance

- DPO can complete the publish flow.
- Analyst can complete the preview flow.
- Analyst cannot trigger scan, review, build, publish, or revoke.
- Both roles must be blocked from raw PII and credentials.

## UI Guardrail Expectations

- Navigation should hide actions that the current role cannot use.
- Buttons should be disabled when backend state makes the action invalid.
- If backend rejects an action, show a clear safe error message.
- Frontend role checks are for user experience only; backend must still enforce permissions.
