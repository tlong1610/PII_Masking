import { z } from 'zod';
import { apiRequest, apiRequestFile, apiRequestText, type DownloadedFile } from '@/shared/api/client';

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

export const sourceTestResultSchema = z.object({
  ok: z.boolean(),
  engine: z.string(),
  message: z.string(),
});

export const sourceScopeSchema = z.object({
  source_id: z.string(),
  source_type: z.enum(['SQL', 'NOSQL']),
  engine: z.string(),
  items: z.array(z.object({
    name: z.string(),
    kind: z.string(),
    field_count: z.number(),
    fields: z.array(z.object({
      name: z.string(),
      data_type: z.string(),
      is_primary_key: z.boolean(),
      is_foreign_key: z.boolean(),
    })).default([]),
    row_count: z.number().nullable().optional(),
    document_count: z.number().nullable().optional(),
  })),
  relationships: z.array(z.object({
    source_table: z.string(),
    source_column: z.string(),
    target_table: z.string(),
    target_column: z.string(),
  })).default([]),
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
  recommended_action: z.enum(['MASK', 'REDACT', 'DROP', 'HMAC', 'KEEP']),
  confidence_score: z.number().nullable().optional(),
});

export const datasetSchema = z.object({
  id: z.number(),
  run_id: z.number(),
  dataset_name: z.string(),
  status: z.enum(['STAGING', 'VERIFIED', 'PUBLISHED', 'REVOKED', 'FAILED']),
  output_location: z.string(),
});

export const fieldDecisionSchema = z.object({
  id: z.number(),
  field_profile_id: z.number(),
  action: z.enum(['MASK', 'REDACT', 'DROP', 'HMAC', 'KEEP']),
  reason: z.string(),
  is_exception: z.boolean().optional(),
  exception_until: z.string().nullable().optional(),
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
    'REVOKED',
    'CANCELLED',
  ]),
  created_by: z.number(),
  source_manifest_version: z.string(),
  policy_version: z.string(),
  field_profiles: z.array(fieldProfileSchema),
  field_decisions: z.array(fieldDecisionSchema),
  datasets: z.array(datasetSchema),
});

export const datasetPreviewSchema = z.object({
  dataset_id: z.number(),
  dataset_name: z.string(),
  status: z.enum(['STAGING', 'VERIFIED', 'PUBLISHED', 'REVOKED', 'FAILED']),
  columns: z.array(z.object({
    name: z.string(),
    source_path: z.string().default('unknown'),
    data_type: z.string(),
    transform: z.enum(['MASK', 'REDACT', 'HMAC', 'KEEP', 'DROPPED']),
  })),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
  tables: z.array(z.string()).default([]),
  selected_table: z.string().default(''),
  note: z.string().optional(),
  relationships: z.array(z.object({
    source_table: z.string(),
    source_column: z.string(),
    target_table: z.string(),
    target_column: z.string(),
  })).default([]),
  verification: z.object({ passed: z.number(), total: z.number() }).nullable().optional(),
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
export type SourceTestResult = z.infer<typeof sourceTestResultSchema>;

export interface SourceInput {
  name: string;
  url: string;
  namespace: string;
  tables: string[];
}

export type SourceScope = z.infer<typeof sourceScopeSchema>;
export type SourceScopeItem = SourceScope['items'][number];
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

export async function testDataSource(input: SourceInput): Promise<SourceTestResult> {
  const data = await apiRequest<SourceTestResult>('/sources/test', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return sourceTestResultSchema.parse(data);
}

export async function createDataSource(input: SourceInput): Promise<Source> {
  const data = await apiRequest<Source>('/sources', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return sourceSchema.parse(data);
}

export async function deleteDataSource(sourceId: string, force = false): Promise<void> {
  const query = force ? '?force=true' : '';
  await apiRequest<void>(`/sources/${encodeURIComponent(sourceId)}${query}`, { method: 'DELETE' });
}

export async function fetchSourceScope(sourceId: string): Promise<SourceScope> {
  const data = await apiRequest<SourceScope>(`/sources/${sourceId}/scope`);
  return sourceScopeSchema.parse(data);
}

// ============================================================================
// RUNS API
// ============================================================================

/** linkScope: link-only tables (missing parent/bridge) — backend keeps only their join keys, as HMAC. */
export async function createScanRun(sourceId: string, selectedScope: string[], linkScope: string[] = []): Promise<Run> {
  const data = await apiRequest<Run>('/runs', {
    method: 'POST',
    body: JSON.stringify({ source_id: sourceId, selected_scope: selectedScope, link_scope: linkScope }),
  });
  return runSchema.parse(data);
}

export async function getRunById(runId: number): Promise<Run> {
  const data = await apiRequest<Run>(`/runs/${runId}`);
  return runSchema.parse(data);
}

export interface FieldDecisionInput {
  field_profile_id: number;
  action: 'MASK' | 'REDACT' | 'DROP' | 'HMAC' | 'KEEP';
  reason?: string;
  is_exception?: boolean;
  exception_until?: string | null;
  /** DPO confirms an UNKNOWN field is not personal data (reason required). */
  classification_override?: 'NON_PERSONAL' | null;
}

export async function updateFieldDecisions(
  runId: number,
  decisions: FieldDecisionInput[],
): Promise<Run> {
  const data = await apiRequest<Run>(`/runs/${runId}/decisions`, {
    method: 'PUT',
    body: JSON.stringify({ decisions }),
  });
  return runSchema.parse(data);
}

export const joinKeySchema = z.object({
  from_table: z.string(),
  from_column: z.string(),
  to_table: z.string(),
  to_column: z.string(),
});

export type JoinKey = z.infer<typeof joinKeySchema>;

export async function fetchJoinKeys(runId: number): Promise<JoinKey[]> {
  const data = await apiRequest<JoinKey[]>(`/runs/${runId}/join-keys`);
  return z.array(joinKeySchema).parse(data);
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

export interface DatasetPreviewOptions {
  table?: string | null;
  limit?: number;
}

export async function previewDataset(
  datasetId: number,
  options: DatasetPreviewOptions = {},
): Promise<DatasetPreview> {
  const params = new URLSearchParams();
  if (options.table) params.set('table', options.table);
  if (options.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  const data = await apiRequest<DatasetPreview>(
    `/datasets/${datasetId}/preview${query ? `?${query}` : ''}`,
  );
  return datasetPreviewSchema.parse(data);
}

/**
 * Every protected row of a published dataset: a ZIP with one CSV per table, or one table's CSV.
 * Values come from the snapshot, already MASK/HMAC/DROP — never raw PII.
 */
export async function exportDataset(datasetId: number, table?: string | null): Promise<DownloadedFile> {
  const query = table ? `?table=${encodeURIComponent(table)}` : '';
  return apiRequestFile(`/datasets/${datasetId}/export${query}`);
}

// ============================================================================
// RISK SCORE API (FR-10, §9.4)
// ============================================================================

export const riskScoreSchema = z.object({
  score: z.number(),
  tier: z.enum(['Critical', 'High', 'Medium', 'Low']),
  action_required: z.string(),
  max_sensitivity_level: z.string(),
  drivers: z.object({
    sens_factor: z.number(),
    cov_factor: z.number(),
    vol_factor: z.number(),
    total_fields: z.number(),
    total_pii_fields: z.number(),
    unmasked_pii_fields: z.number(),
    protected_pii_fields: z.number(),
    protection_pct: z.number(),
    row_count: z.number(),
  }),
  /** True when the source could not be counted and the volume factor uses a default. */
  row_count_estimated: z.boolean().default(false),
});

export type RiskScoreResult = z.infer<typeof riskScoreSchema>;

/** Compliance report as an HTML document, fetched with the Authorization header (never ?token=). */
export async function fetchRunReportHtml(runId: number): Promise<string> {
  return apiRequestText(`/runs/${runId}/report?format=html`);
}

export async function fetchRiskScore(runId: number): Promise<RiskScoreResult> {
  const data = await apiRequest<RiskScoreResult>(`/runs/${runId}/risk-score`);
  return riskScoreSchema.parse(data);
}

// ============================================================================
// VAULT DETOKENIZE API (FR-13, §9.5)
// ============================================================================

export interface DetokenizeRequest {
  token: string;
  reason: string;
}

export interface DetokenizeResponse {
  token: string;
  raw_value: string;
  entity_type: string;
  key_version: string;
  decrypted_at: string;
}

export async function detokenizeValue(req: DetokenizeRequest): Promise<DetokenizeResponse> {
  return await apiRequest<DetokenizeResponse>('/vault/detokenize', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ============================================================================
// HEALTH & READINESS PROBES (§17.1)
// ============================================================================

export interface HealthzResponse {
  status: string;
  timestamp: string;
  version: string;
}

export interface ReadyzResponse {
  status: string;
  checks: Record<string, string>;
  timestamp: string;
}

export async function checkLiveness(): Promise<HealthzResponse> {
  return await apiRequest<HealthzResponse>('/healthz');
}

export async function checkReadiness(): Promise<ReadyzResponse> {
  return await apiRequest<ReadyzResponse>('/readyz');
}

