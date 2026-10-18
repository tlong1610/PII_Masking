import { Navigate, useParams } from 'react-router-dom';
import { useDatasetDetail } from '@/features/datasets';
import { routes } from '@/shared/config/routes';
import { MascotLoader, StateNotice } from '@/shared/ui';

/** Old dataset links (audit log, bookmarks) open the run that owns the dataset. */
export function DpoDatasetDetailPage(): JSX.Element {
  const { datasetId } = useParams();
  const validId = datasetId !== undefined && /^\d+$/.test(datasetId) ? Number(datasetId) : null;
  const { data: dataset, isLoading, isError } = useDatasetDetail(validId);

  if (validId === null || isError) {
    return <StateNotice kind="error" title="Dataset không hợp lệ" description="Không tìm thấy dataset hoặc lượt quét của nó." />;
  }
  if (isLoading || !dataset) return <MascotLoader title="Đang mở lượt quét của dataset…" />;
  return <Navigate to={routes.dpoRun(dataset.run_id)} replace />;
}
