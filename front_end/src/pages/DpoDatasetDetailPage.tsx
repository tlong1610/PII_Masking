import { useParams } from 'react-router-dom';
import { DatasetDetailView } from '@/features/datasets';
import { StateNotice } from '@/shared/ui';

export function DpoDatasetDetailPage(): JSX.Element {
  const { datasetId } = useParams();
  if (datasetId === undefined || !/^\d+$/.test(datasetId)) {
    return <StateNotice kind="error" title="Dataset không hợp lệ" description="Đường dẫn không chứa mã dataset hợp lệ." />;
  }
  return <DatasetDetailView datasetId={Number(datasetId)} />;
}
