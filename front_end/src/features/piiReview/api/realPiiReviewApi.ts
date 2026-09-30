import { z } from 'zod';
import { apiRequest } from '@/shared/api/client';

// ============================================================================
// TYPES (matching backend schemas)
// ============================================================================

export const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  source_type: z.enum(['SQL', 'NOSQL']),
  engine: z.string(),
  description: z.string(),
  scope_summary: z.string(),
  status: z.string(),
});

export const fieldProfileSchema = z.object({
  id: z.number(),
  source_path: z.string(),
  field_path: z.string(),
  data_type: z.string(),
  profile_summary: z.string(),
  classification: z.string(),
  taxonomy_id: z.string().nullable(),
  detector_source: z.enum(['rule', 'ai', 'dpo', 'unknown']),
  coverage_status: z.string(),
  recommended_action: z.enum(['MASK', 'DROP', 'HMAC', 'KEEP']),
});

export const runSchema = z.object({
  id: z.number(),
  source_id: z.string(),
  source_type: z.enum(['SQL', 'NOSQL']),
  source_name: z.string(),
  engine: z.string(),
  status: z.enum([
    'NEW',
    'SCANNING',
    'REVIEW_REQUIRED',
    'READY_TO_BUILD',
    'BUILDING',
    'VERIFIED',
    'PUBLISHED',
    'FAILED',
    'STALE',
    'REVOKED'
  ]),
  created_by: z.number(),
  source_manifest_version: z.string(),
  policy_version: z.string(),
  field_profiles: z.array(fieldProfileSchema),
  field_decisions: z.array(z.any()),
  datasets: z.array(z.any()),
});

export const datasetSchema = z.object({
  id: z.number(),
  run_id: z.number(),
  dataset_name: z.string(),
  status: z.enum(['STAGING', 'VERIFIED', 'PUBLISHED', 'REVOKED', 'FAILED']),
  output_location: z.string(),
});

export const datasetPreviewSchema = z.object({
  dataset_id: z.number(),
  dataset_name: z.string(),
  status: z.enum(['STAGING', 'VERIFIED', 'PUBLISHED', 'REVOKED', 'FAILED']),
  columns: z.array(z.object({
    name: z.string(),
    source_path: z.string().default('unknown'),
    data_type: z.string(),
    transform: z.enum(['MASK', 'HMAC', 'KEEP', 'DROPPED']),
  })),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
  note: z.string().optional(),
  relationships: z.array(z.object({
    source_table: z.string(),
    source_column: z.string(),
    target_table: z.string(),
    target_column: z.string(),
  })).default([]),
});

export const verifierResultSchema = z.object({
  id: z.number(),
  dataset_id: z.number(),
  check_name: z.string(),
  status: z.enum(['PASSED', 'FAILED']),
  baseline_value: z.string(),
  actual_value: z.string(),
  tolerance: z.string(),
  details: z.string(),
});

export const buildResponseSchema = z.object({
  run: runSchema,
  dataset: datasetSchema,
  verifier_results: z.array(verifierResultSchema),
});

export type Source = z.infer<typeof sourceSchema>;
export type FieldProfile = z.infer<typeof fieldProfileSchema>;
export type Run = z.infer<typeof runSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type DatasetPreview = z.infer<typeof datasetPreviewSchema>;
export type DatasetRelationship = DatasetPreview['relationships'][number];
export type VerifierResult = z.infer<typeof verifierResultSchema>;
export type BuildResponse = z.infer<typeof buildResponseSchema>;

// ============================================================================
// SOURCES API
// ============================================================================

export async function fetchDataSources(): Promise<Source[]> {
  const data = await apiRequest<Source[]>('/sources');
  return z.array(sourceSchema).parse(data);
}

// ============================================================================
// RUNS API
// ============================================================================

export async function createScanRun(sourceId: string): Promise<Run> {
  const data = await apiRequest<Run>('/runs', {
    method: 'POST',
    body: JSON.stringify({ source_id: sourceId }),
  });
  return runSchema.parse(data);
}

export async function getRunById(runId: number): Promise<Run> {
  const data = await apiRequest<Run>(`/runs/${runId}`);
  return runSchema.parse(data);
}

export async function listRuns(sourceId?: string): Promise<Run[]> {
  const query = sourceId ? `?source_id=${sourceId}` : '';
  const data = await apiRequest<Run[]>(`/runs${query}`);
  return z.array(runSchema).parse(data);
}

export async function updateFieldDecisions(
  runId: number,
  decisions: Array<{ field_profile_id: number; action: 'MASK' | 'DROP' | 'HMAC' | 'KEEP'; reason?: string }>
): Promise<Run> {
  const data = await apiRequest<Run>(`/runs/${runId}/decisions`, {
    method: 'PUT',
    body: JSON.stringify({ decisions }),
  });
  return runSchema.parse(data);
}

export async function buildDataset(runId: number): Promise<BuildResponse> {
  const data = await apiRequest<BuildResponse>(`/runs/${runId}/build`, {
    method: 'POST',
  });
  return buildResponseSchema.parse(data);
}

// ============================================================================
// DATASETS API
// ============================================================================

export async function listDatasets(status?: 'STAGING' | 'VERIFIED' | 'PUBLISHED' | 'REVOKED' | 'FAILED'): Promise<Dataset[]> {
  const query = status ? `?status=${status}` : '';
  const data = await apiRequest<Dataset[]>(`/datasets${query}`);
  return z.array(datasetSchema).parse(data);
}

export async function publishDataset(datasetId: number): Promise<Dataset> {
  const data = await apiRequest<Dataset>(`/datasets/${datasetId}/publish`, {
    method: 'POST',
  });
  return datasetSchema.parse(data);
}

export async function revokeDataset(datasetId: number): Promise<Dataset> {
  const data = await apiRequest<Dataset>(`/datasets/${datasetId}/revoke`, {
    method: 'POST',
  });
  return datasetSchema.parse(data);
}

export async function previewDataset(datasetId: number): Promise<DatasetPreview> {
  const data = await apiRequest<DatasetPreview>(`/datasets/${datasetId}/preview`);
  return datasetPreviewSchema.parse(data);
}
