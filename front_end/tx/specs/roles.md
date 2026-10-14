# Roles Spec

## Shared Rule

Analyst strictly has Zero Raw-PII access. DPO, as the legally responsible officer under Decree 13 and PDPD 2025, is authorized to inspect sample data within the secure review workspace (Field Drawer / Split view) solely to verify PII classifications and adjudicate protection risks.

## DPO

DPO means Data Protection Officer: the reviewer responsible for approving how personal data is handled before a protected dataset is released.

### DPO can

- View configured sources (PostgreSQL & MongoDB Cloud).
- View safe source scope summary and visual diagrams.
- Start a scan over the configured scope.
- Review field profiles and inspect sample data in the secure review drawer to verify UNKNOWN/PII fields.
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
