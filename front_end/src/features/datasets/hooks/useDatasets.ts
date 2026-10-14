import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/datasetsApi';
import type { DatasetStatus } from '../model/types';

export const datasetQueryKeys = {
  all: ['datasets'] as const,
  list: (status?: DatasetStatus) => ['datasets', 'list', status ?? 'ALL'] as const,
  detail: (datasetId: number) => ['datasets', 'detail', datasetId] as const,
  grants: (datasetId: number) => ['datasets', 'grants', datasetId] as const,
  preview: (datasetId: number, table: string | null) => ['datasets', 'preview', datasetId, table] as const,
  analysts: ['datasets', 'analysts'] as const,
};

export function useDatasetList(status?: DatasetStatus) {
  return useQuery({
    queryKey: datasetQueryKeys.list(status),
    queryFn: () => api.fetchDatasets(status),
    // Publish/revoke also happen from the review wizard; always refetch when the list mounts.
    staleTime: 0,
  });
}

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

export function useDatasetGrants(datasetId: number | null) {
  return useQuery({
    queryKey: datasetQueryKeys.grants(datasetId ?? 0),
    queryFn: () => api.fetchDatasetGrants(datasetId ?? 0),
    enabled: datasetId !== null,
    staleTime: 0,
  });
}

export function useAnalysts() {
  return useQuery({ queryKey: datasetQueryKeys.analysts, queryFn: api.fetchAnalysts, staleTime: 60_000 });
}

export function useGrantDatasetAccess(datasetId: number) {
  const invalidate = useInvalidateDatasets();
  return useMutation({
    mutationFn: (userId: number) => api.grantDatasetAccess(datasetId, userId),
    onSuccess: invalidate,
  });
}

export function useRevokeDatasetAccess(datasetId: number) {
  const invalidate = useInvalidateDatasets();
  return useMutation({
    mutationFn: (userId: number) => api.revokeDatasetAccess(datasetId, userId),
    onSuccess: invalidate,
  });
}
