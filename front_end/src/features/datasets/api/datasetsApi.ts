import { z } from 'zod';
import { apiRequest } from '@/shared/api/client';
import { DATASET_STATUSES } from '../model/types';

const timestamp = z.string().nullable().optional();

export const datasetSummarySchema = z.object({
  id: z.number(),
  run_id: z.number(),
  dataset_name: z.string(),
  status: z.enum(DATASET_STATUSES),
  output_location: z.string(),
  created_at: timestamp,
  published_at: timestamp,
  revoked_at: timestamp,
  source_id: z.string().nullable().optional(),
  source_name: z.string().nullable().optional(),
  engine: z.string().nullable().optional(),
  grant_count: z.number().nullable().optional(),
});

const verifierResultSchema = z.object({
  id: z.number(),
  check_name: z.string(),
  status: z.enum(['PASSED', 'FAILED']),
  baseline_value: z.string(),
  actual_value: z.string(),
  tolerance: z.string(),
  details: z.string(),
});

export const datasetDetailSchema = datasetSummarySchema.extend({
  run_status: z.string().nullable().optional(),
  verifier_results: z.array(verifierResultSchema).default([]),
  action_counts: z.record(z.number()).default({}),
});

export const datasetPreviewSchema = z.object({
  dataset_id: z.number(),
  columns: z.array(
    z.object({
      name: z.string(),
      source_path: z.string().default(''),
      data_type: z.string(),
      transform: z.enum(['MASK', 'REDACT', 'HMAC', 'KEEP', 'DROPPED']),
    }),
  ),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
  tables: z.array(z.string()).default([]),
  selected_table: z.string().default(''),
  note: z.string().optional(),
});

export type DatasetSummary = z.infer<typeof datasetSummarySchema>;
export type DatasetDetail = z.infer<typeof datasetDetailSchema>;
export type VerifierResult = DatasetDetail['verifier_results'][number];
export type DatasetPreview = z.infer<typeof datasetPreviewSchema>;

export async function fetchDatasetDetail(datasetId: number): Promise<DatasetDetail> {
  return datasetDetailSchema.parse(await apiRequest<unknown>(`/datasets/${datasetId}`));
}

export async function publishDataset(datasetId: number): Promise<DatasetSummary> {
  const data = await apiRequest<unknown>(`/datasets/${datasetId}/publish`, { method: 'POST' });
  return datasetSummarySchema.parse(data);
}

export async function revokeDataset(datasetId: number): Promise<DatasetSummary> {
  const data = await apiRequest<unknown>(`/datasets/${datasetId}/revoke`, { method: 'POST' });
  return datasetSummarySchema.parse(data);
}

export async function renameDataset(datasetId: number, datasetName: string): Promise<DatasetSummary> {
  const data = await apiRequest<unknown>(`/datasets/${datasetId}`, {
    method: 'PATCH',
    body: JSON.stringify({ dataset_name: datasetName }),
  });
  return datasetSummarySchema.parse(data);
}

export async function fetchDatasetPreview(datasetId: number, table: string | null): Promise<DatasetPreview> {
  const query = table ? `?table=${encodeURIComponent(table)}` : '';
  return datasetPreviewSchema.parse(await apiRequest<unknown>(`/datasets/${datasetId}/preview${query}`));
}
