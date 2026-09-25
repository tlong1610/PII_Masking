import { z } from 'zod';

export const dataSourceOptionSchema = z.object({
  id: z.enum(['postgresql', 'mongodb']),
  name: z.string(),
  engineLabel: z.string(),
  connectionState: z.enum(['verified', 'warning']),
  scopeLabel: z.string(),
  fieldCount: z.number(),
  recordCount: z.number(),
  unsupportedSummary: z.string(),
  downstreamTask: z.string(),
});

export const reviewFieldSchema = z.object({
  id: z.string(),
  path: z.string(),
  dataType: z.string(),
  filteredProfile: z.string(),
  classification: z.enum(['PERSONAL_BASIC', 'PERSONAL_SENSITIVE', 'NON_PERSONAL', 'UNKNOWN']),
  taxonomyLabel: z.string(),
  legalBasis: z.string(),
  suggestionSource: z.enum(['rule', 'ai', 'dpo', 'none']),
  coverage: z.enum(['AUTO_SUPPORTED', 'REVIEW_REQUIRED', 'UNSUPPORTED']),
  action: z.enum(['DROP', 'MASK', 'HMAC', 'KEEP']),
  reviewState: z.enum(['accepted', 'edited', 'rejected', 'pending']),
  impact: z.string(),
  reason: z.string(),
});

export const reviewRunSchema = z.object({
  id: z.string(),
  sourceId: z.enum(['postgresql', 'mongodb']),
  sourceName: z.string(),
  status: z.enum([
    'NEW',
    'SCANNING',
    'REVIEW_REQUIRED',
    'READY_TO_BUILD',
    'BUILDING',
    'VERIFIED',
    'PUBLISHED',
    'FAILED',
    'REVOKED',
  ]),
  startedAt: z.string(),
  fixtureVersion: z.string(),
  policyVersion: z.string(),
  fields: z.array(reviewFieldSchema),
});

export const verificationReportSchema = z.object({
  datasetId: z.string(),
  runId: z.string(),
  status: z.enum(['VERIFIED', 'PUBLISHED', 'REVOKED']),
  sourceName: z.string(),
  snapshotAt: z.string(),
  policyVersion: z.string(),
  verifierChecks: z.array(
    z.object({
      label: z.string(),
      result: z.enum(['passed', 'warning']),
      detail: z.string(),
    }),
  ),
  downstreamMetrics: z.array(
    z.object({
      label: z.string(),
      before: z.string(),
      after: z.string(),
      delta: z.string(),
    }),
  ),
  warnings: z.array(
    z.object({
      kind: z.enum(['blocking', 'legal', 'detection']),
      message: z.string(),
    }),
  ),
});

export const analystDatasetSchema = z.object({
  datasetId: z.string(),
  sourceName: z.string(),
  publishedAt: z.string(),
  allowedTask: z.string(),
  removedFields: z.number(),
  previewRows: z.array(z.record(z.string())),
  aggregateRows: z.array(
    z.object({
      segment: z.string(),
      orders: z.number(),
      revenue: z.string(),
    }),
  ),
});
