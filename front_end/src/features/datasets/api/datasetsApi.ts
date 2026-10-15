import { z } from 'zod';
import { apiRequest } from '@/shared/api/client';
import { DATASET_STATUSES, type DatasetStatus } from '../model/types';

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

export const datasetGrantSchema = z.object({
  id: z.number(),
  dataset_id: z.number(),
  user_id: z.number(),
  granted_by: z.number(),
  created_at: z.string(),
  username: z.string().nullable().optional(),
});

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: z.enum(['DPO', 'ANALYST']),
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
export type DatasetGrant = z.infer<typeof datasetGrantSchema>;
export type AppUser = z.infer<typeof userSchema>;
export type DatasetPreview = z.infer<typeof datasetPreviewSchema>;

export async function fetchDatasets(status?: DatasetStatus): Promise<DatasetSummary[]> {
  const query = status ? `?status=${status}` : '';
  return z.array(datasetSummarySchema).parse(await apiRequest<unknown>(`/datasets${query}`));
}

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

export async function fetchDatasetGrants(datasetId: number): Promise<DatasetGrant[]> {
  return z.array(datasetGrantSchema).parse(await apiRequest<unknown>(`/datasets/${datasetId}/grants`));
}

export async function grantDatasetAccess(datasetId: number, userId: number): Promise<DatasetGrant> {
  const data = await apiRequest<unknown>(`/datasets/${datasetId}/grants`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
  return datasetGrantSchema.parse(data);
}

export async function revokeDatasetAccess(datasetId: number, userId: number): Promise<void> {
  await apiRequest<void>(`/datasets/${datasetId}/grants/${userId}`, { method: 'DELETE' });
}

export async function fetchAnalysts(): Promise<AppUser[]> {
  return z.array(userSchema).parse(await apiRequest<unknown>('/users?role=ANALYST'));
}

export async function fetchDatasetPreview(datasetId: number, table: string | null): Promise<DatasetPreview> {
  const query = table ? `?table=${encodeURIComponent(table)}` : '';
  return datasetPreviewSchema.parse(await apiRequest<unknown>(`/datasets/${datasetId}/preview${query}`));
}
