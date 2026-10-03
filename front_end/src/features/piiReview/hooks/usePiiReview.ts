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
  datasetPreview: (datasetId: number) => ['pii-review', 'dataset-preview', datasetId] as const,
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
    mutationFn: (sourceId: string) => api.deleteDataSource(sourceId),
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

export function useRuns(sourceId?: string) {
  return useQuery({
    queryKey: [...piiReviewQueryKeys.runs, sourceId],
    queryFn: () => api.listRuns(sourceId),
    staleTime: 10000,
  });
}

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
    mutationFn: ({ sourceId, selectedScope }: { sourceId: string; selectedScope: string[] }) =>
      api.createScanRun(sourceId, selectedScope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.runs });
    },
  });
}

export function useUpdateFieldDecisions(runId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (decisions: Array<{ field_profile_id: number; action: 'MASK' | 'DROP' | 'HMAC' | 'KEEP'; reason?: string }>) =>
      api.updateFieldDecisions(runId, decisions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.run(runId) });
    },
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

export function useDatasetPreview(datasetId: number | null) {
  return useQuery({
    queryKey: piiReviewQueryKeys.datasetPreview(datasetId!),
    queryFn: () => api.previewDataset(datasetId!),
    enabled: datasetId !== null,
  });
}
