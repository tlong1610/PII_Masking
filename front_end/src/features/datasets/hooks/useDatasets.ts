import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/datasetsApi';

export const datasetQueryKeys = {
  all: ['datasets'] as const,
  detail: (datasetId: number) => ['datasets', 'detail', datasetId] as const,
  preview: (datasetId: number, table: string | null) => ['datasets', 'preview', datasetId, table] as const,
};

export function useDatasetDetail(datasetId: number | null) {
  return useQuery({
    queryKey: datasetQueryKeys.detail(datasetId ?? 0),
    queryFn: () => api.fetchDatasetDetail(datasetId ?? 0),
    enabled: datasetId !== null,
    staleTime: 0,
  });
}

export function useDatasetPreview(datasetId: number | null, table: string | null, enabled: boolean) {
  return useQuery({
    queryKey: datasetQueryKeys.preview(datasetId ?? 0, table),
    queryFn: () => api.fetchDatasetPreview(datasetId ?? 0, table),
    enabled: datasetId !== null && enabled,
    retry: false,
  });
}

function useInvalidateDatasets(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: datasetQueryKeys.all });
  };
}

export function usePublishDataset() {
  const invalidate = useInvalidateDatasets();
  return useMutation({ mutationFn: api.publishDataset, onSuccess: invalidate });
}

export function useRevokeDataset() {
  const invalidate = useInvalidateDatasets();
  return useMutation({ mutationFn: api.revokeDataset, onSuccess: invalidate });
}
