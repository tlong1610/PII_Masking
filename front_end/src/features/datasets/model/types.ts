export const DATASET_STATUSES = ['STAGING', 'VERIFIED', 'PUBLISHED', 'REVOKED', 'FAILED'] as const;
export type DatasetStatus = (typeof DATASET_STATUSES)[number];

/** How a column reached the protected snapshot. */
export const TRANSFORM_KINDS = ['MASK', 'REDACT', 'HMAC', 'KEEP', 'DROPPED'] as const;
export type TransformKind = (typeof TRANSFORM_KINDS)[number];
