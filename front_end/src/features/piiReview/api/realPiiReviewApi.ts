import { z } from 'zod';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  id: z.string(),
  path: z.string(),
  data_type: z.string(),
  classification: z.string(),
  taxonomy_label: z.string().optional(),
  suggested_action: z.enum(['MASK', 'DROP', 'HMAC', 'KEEP']),
  detector_source: z.enum(['rule', 'ai', 'unknown']),
  reason: z.string(),
});

export const runSchema = z.object({
  id: z.number(),
  source_id: z.string(),
  status: z.enum(['pending', 'scanning', 'ready_for_review', 'approved', 'rejected']),
  created_at: z.string(),
  scan_completed_at: z.string().nullable(),
  fields: z.array(fieldProfileSchema),
});

export const datasetSchema = z.object({
  id: z.number(),
  run_id: z.number(),
  dataset_name: z.string(),
  status: z.enum(['draft', 'published', 'revoked']),
  output_location: z.string().nullable(),
});

export const datasetPreviewSchema = z.object({
  dataset_name: z.string(),
  columns: z.array(z.object({
    name: z.string(),
    sample_masked_value: z.string().nullable(),
  })),
  row_count: z.number(),
});

export type Source = z.infer<typeof sourceSchema>;
export type FieldProfile = z.infer<typeof fieldProfileSchema>;
export type Run = z.infer<typeof runSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type DatasetPreview = z.infer<typeof datasetPreviewSchema>;

// ============================================================================
// API ERROR
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// API CLIENT
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const token = sessionStorage.getItem('auth_token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(
      error.message || error.detail || response.statusText,
      response.status,
      error
    );
  }

  return response.json();
}

// ============================================================================
// SOURCES API
// ============================================================================

export async function fetchDataSources(): Promise<Source[]> {
  const data = await apiRequest<Source[]>('/api/v1/sources');
  return z.array(sourceSchema).parse(data);
}

// ============================================================================
// RUNS API
// ============================================================================

export async function createScanRun(sourceId: string): Promise<Run> {
  const data = await apiRequest<Run>(`/api/v1/runs`, {
    method: 'POST',
    body: JSON.stringify({ source_id: sourceId }),
  });
  return runSchema.parse(data);
}

export async function getRunById(runId: number): Promise<Run> {
  const data = await apiRequest<Run>(`/api/v1/runs/${runId}`);
  return runSchema.parse(data);
}

export async function listRuns(sourceId?: string): Promise<Run[]> {
  const query = sourceId ? `?source_id=${sourceId}` : '';
  const data = await apiRequest<Run[]>(`/api/v1/runs${query}`);
  return z.array(runSchema).parse(data);
}

export async function updateFieldDecisions(
  runId: number,
  decisions: Array<{ field_id: string; action: 'MASK' | 'DROP' | 'HMAC' | 'KEEP' }>
): Promise<void> {
  await apiRequest(`/api/v1/runs/${runId}/decisions`, {
    method: 'PUT',
    body: JSON.stringify({ field_decisions: decisions }),
  });
}

export async function approveRun(runId: number): Promise<void> {
  await apiRequest(`/api/v1/runs/${runId}/approve`, {
    method: 'POST',
  });
}

export async function buildDataset(runId: number): Promise<{ dataset_id: number }> {
  const data = await apiRequest<{ dataset_id: number }>(`/api/v1/runs/${runId}/build`, {
    method: 'POST',
  });
  return data;
}

// ============================================================================
// DATASETS API
// ============================================================================

export async function listDatasets(status?: 'draft' | 'published' | 'revoked'): Promise<Dataset[]> {
  const query = status ? `?status=${status}` : '';
  const data = await apiRequest<Dataset[]>(`/api/v1/datasets${query}`);
  return z.array(datasetSchema).parse(data);
}

export async function publishDataset(datasetId: number): Promise<void> {
  await apiRequest(`/api/v1/datasets/${datasetId}/publish`, {
    method: 'POST',
  });
}

export async function previewDataset(datasetId: number): Promise<DatasetPreview> {
  const data = await apiRequest<DatasetPreview>(`/api/v1/datasets/${datasetId}/preview`);
  return datasetPreviewSchema.parse(data);
}

