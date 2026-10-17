import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePublishDataset, useRevokeDataset } from '@/features/datasets';
import { deleteRun, fetchRunHistory } from '../api/runHistoryApi';
import type { RunStatus } from '../model/runActions';

export const runHistoryQueryKeys = {
  all: ['run-history'] as const,
  list: (status?: RunStatus) => ['run-history', status ?? 'ALL'] as const,
};

export function useRunHistory(status?: RunStatus) {
  return useQuery({
    queryKey: runHistoryQueryKeys.list(status),
    queryFn: () => fetchRunHistory(status),
    // Runs change from the review wizard; refetch whenever the history page mounts.
    staleTime: 0,
  });
}

export interface DeleteRunsResult {
  deleted: number[];
  failed: { runId: number; message: string }[];
}

/** Deletes runs one by one so a run the backend refuses does not stop the others. */
export function useDeleteRuns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (runIds: number[]): Promise<DeleteRunsResult> => {
      const result: DeleteRunsResult = { deleted: [], failed: [] };
      for (const runId of runIds) {
        try {
          await deleteRun(runId);
          result.deleted.push(runId);
        } catch (error) {
          result.failed.push({ runId, message: error instanceof Error ? error.message : 'Không xoá được run.' });
        }
      }
      return result;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: runHistoryQueryKeys.all });
    },
  });
}

/** Publishes or revokes a run's dataset straight from the history list, then refreshes the list. */
export function useRunDatasetAction() {
  const queryClient = useQueryClient();
  const publish = usePublishDataset();
  const revoke = useRevokeDataset();
  return useMutation({
    mutationFn: ({ kind, datasetId }: { kind: 'publish' | 'revoke'; datasetId: number }) =>
      (kind === 'publish' ? publish : revoke).mutateAsync(datasetId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: runHistoryQueryKeys.all });
    },
  });
}
