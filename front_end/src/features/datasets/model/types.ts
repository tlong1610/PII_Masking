export const DATASET_STATUSES = ['STAGING', 'VERIFIED', 'PUBLISHED', 'REVOKED', 'FAILED'] as const;
export type DatasetStatus = (typeof DATASET_STATUSES)[number];
