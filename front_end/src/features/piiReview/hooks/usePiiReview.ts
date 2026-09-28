import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/realPiiReviewApi';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const piiReviewQueryKeys = {
  sources: ['pii-review', 'sources'] as const,
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
    mutationFn: (sourceId: string) => api.createScanRun(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.runs });
    },
  });
}

export function useUpdateFieldDecisions(runId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (decisions: Array<{ field_id: string; action: 'MASK' | 'DROP' | 'HMAC' | 'KEEP' }>) =>
      api.updateFieldDecisions(runId, decisions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.run(runId) });
    },
  });
}

export function useApproveRun(runId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.approveRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.runs });
    },
  });
}

export function useBuildDataset(runId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.buildDataset(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.datasets() });
    },
  });
}

// ============================================================================
// DATASETS
// ============================================================================

export function useDatasets(status?: 'draft' | 'published' | 'revoked') {
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
      queryClient.invalidateQueries({ queryKey: piiReviewQueryKeys.datasets() });
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

