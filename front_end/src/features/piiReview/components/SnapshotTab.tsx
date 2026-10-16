import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DatasetPreviewTable, VerifierResultsTable, useDatasetDetail } from '@/features/datasets';
import type { DatasetStatus } from '../model/policyLabels';

type SnapshotTabProps = {
  datasetId: number | null;
  datasetStatus: DatasetStatus | null;
};

function Section({ title, children }: { title: string; children: JSX.Element }): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/** What the Analyst gets: verification of the saved data and its protected rows — never raw values. */
export function SnapshotTab({ datasetId, datasetStatus }: SnapshotTabProps): JSX.Element {
  const { data: dataset, isLoading } = useDatasetDetail(datasetId);
  const hasData = datasetStatus === 'VERIFIED' || datasetStatus === 'PUBLISHED';

  if (datasetId === null) {
    return <Alert severity="info">Chưa lưu. Duyệt quyết định rồi bấm “Lưu” để tạo dữ liệu đã bảo vệ cho Analyst.</Alert>;
  }
  if (datasetStatus === 'STAGING') {
    return <Alert severity="info">Quyết định đã thay đổi. Bấm “Lưu” để tạo lại dữ liệu cho Analyst.</Alert>;
  }
  if (datasetStatus === 'REVOKED') {
    return (
      <Alert severity="warning">Đã thu hồi: Analyst không còn xem được. Sửa nếu cần rồi bấm “Lưu” để tạo lại dữ liệu.</Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {datasetStatus === 'FAILED' && (
        <Alert severity="error">
          Dữ liệu đã lưu không qua bước kiểm định nên chưa phát hành được. Điều chỉnh quyết định rồi bấm “Lưu” lại.
        </Alert>
      )}
      <Section title="Kết quả kiểm định">
        {isLoading || !dataset ? <LinearProgress /> : <VerifierResultsTable results={dataset.verifier_results} />}
      </Section>
      {hasData && (
        <Section title="Xem trước dữ liệu cho Analyst">
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Đọc lại từ bản đã bảo vệ, đúng như Analyst sẽ nhận. Giá trị gốc không bao giờ được hiển thị.
            </Typography>
            <DatasetPreviewTable datasetId={datasetId} available />
          </Stack>
        </Section>
      )}
    </Stack>
  );
}
