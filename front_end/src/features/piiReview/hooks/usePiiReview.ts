import { useQuery } from '@tanstack/react-query';
import { fetchAnalystDataset, fetchDataSources, fetchReviewRun, fetchVerificationReport } from '../api/mockPiiReviewApi';
import type { DataSourceKind } from '../model/types';

export const piiReviewQueryKeys = {
  sources: ['pii-review', 'sources'] as const,
  run: (sourceId: DataSourceKind) => ['pii-review', 'run', sourceId] as const,
  report: ['pii-review', 'report'] as const,
  analystDataset: ['pii-review', 'analyst-dataset'] as const,
};

export function useDataSources() {
  return useQuery({
    queryKey: piiReviewQueryKeys.sources,
    queryFn: fetchDataSources,
  });
}

export function useReviewRun(sourceId: DataSourceKind) {
  return useQuery({
    queryKey: piiReviewQueryKeys.run(sourceId),
    queryFn: () => fetchReviewRun(sourceId),
  });
}

export function useVerificationReport() {
  return useQuery({
    queryKey: piiReviewQueryKeys.report,
    queryFn: fetchVerificationReport,
  });
}

export function useAnalystDataset() {
  return useQuery({
    queryKey: piiReviewQueryKeys.analystDataset,
    queryFn: fetchAnalystDataset,
  });
}
