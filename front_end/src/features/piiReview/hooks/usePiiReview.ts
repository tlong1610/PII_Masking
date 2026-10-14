import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/realPiiReviewApi';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const piiReviewQueryKeys = {
  sources: ['pii-review', 'sources'] as const,
  sourceScope: (sourceId: string) => ['pii-review', 'source-scope', sourceId] as const,
  runs: ['pii-review', 'runs'] as const,
  run: (runId: number) => ['pii-review', 'run', runId] as const,
  datasets: (status?: string) => ['pii-review', 'datasets', status] as const,
  datasetPreview: (datasetId: number, table?: string | null, limit?: number) =>
    ['pii-review', 'dataset-preview', datasetId, table ?? null, limit ?? null] as const,
};

// ============================================================================
// SOURCES
// ============================================================================

export function useDataSources() {
  return useQuery({
    queryKey: piiReviewQueryKeys.sources,
    queryFn: api.fetchDataSources,
    staleTime: 30000, // 30s
  });
}

export function useTestDataSource() {
  return useMutation({
    mutationFn: (input: api.SourceInput) => api.testDataSource(input),
  });
}

export function useCreateDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: api.SourceInput) => api.createDataSource(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.sources });
    },
  });
}

export function useDeleteDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (param: string | { sourceId: string; force?: boolean }) => {
      if (typeof param === 'string') {
        return api.deleteDataSource(param, false);
      }
      return api.deleteDataSource(param.sourceId, param.force ?? false);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.sources });
    },
  });
}

export function useSourceScope(sourceId: string | null) {
  return useQuery({
    queryKey: piiReviewQueryKeys.sourceScope(sourceId!),
    queryFn: () => api.fetchSourceScope(sourceId!),
    enabled: sourceId !== null,
    staleTime: 30000,
  });
}

// ============================================================================
// RUNS
// ============================================================================

export function useRun(runId: number | null) {
  return useQuery({
    queryKey: piiReviewQueryKeys.run(runId!),
    queryFn: () => api.getRunById(runId!),
    enabled: runId !== null,
    staleTime: 5000,
  });
}

export function useCreateScanRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      sourceId,
      selectedScope,
      linkScope = [],
    }: {
      sourceId: string;
      selectedScope: string[];
      linkScope?: string[];
    }) => api.createScanRun(sourceId, selectedScope, linkScope),
    onSuccess: (run) => {
      // Seed the run so the review renders at once instead of refetching it.
      queryClient.setQueryData(piiReviewQueryKeys.run(run.id), run);
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.runs });
    },
  });
}

export function useUpdateFieldDecisions(runId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (decisions: api.FieldDecisionInput[]) => api.updateFieldDecisions(runId, decisions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.run(runId) });
    },
  });
}

export function useJoinKeys(runId: number | null) {
  return useQuery({
    queryKey: ['pii-review', 'join-keys', runId] as const,
    queryFn: () => api.fetchJoinKeys(runId!),
    enabled: runId !== null,
    staleTime: 60000,
  });
}

export function useBuildDataset(runId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.buildDataset(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.run(runId) });
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.datasets() });
    },
  });
}

// ============================================================================
// DATASETS
// ============================================================================

export function useDatasets(status?: 'STAGING' | 'VERIFIED' | 'PUBLISHED' | 'REVOKED' | 'FAILED') {
  return useQuery({
    queryKey: piiReviewQueryKeys.datasets(status),
    queryFn: () => api.listDatasets(status),
    staleTime: 10000,
  });
}

export function usePublishDataset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (datasetId: number) => api.publishDataset(datasetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.datasets() });
      // Publishing also moves the run to PUBLISHED.
      void queryClient.invalidateQueries({ queryKey: ['pii-review', 'run'] });
    },
  });
}

export function useRevokeDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datasetId: number) => api.revokeDataset(datasetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.datasets() });
    },
  });
}

export function useDatasetPreview(datasetId: number | null, table?: string | null, limit?: number) {
  return useQuery({
    queryKey: piiReviewQueryKeys.datasetPreview(datasetId!, table, limit),
    queryFn: () => api.previewDataset(datasetId!, { table, limit }),
    enabled: datasetId !== null,
  });
}

export function useRiskScore(runId: number | null) {
  return useQuery({
    queryKey: ['pii-review', 'risk-score', runId] as const,
    queryFn: () => api.fetchRiskScore(runId!),
    enabled: runId !== null,
    staleTime: 5000,
  });
}

