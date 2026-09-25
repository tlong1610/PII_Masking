import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useAnalystDataset } from '../hooks/usePiiReview';
import { SectionHeader, StateNotice } from '@/shared/ui';

export function AnalystDatasetExperience(): JSX.Element {
  const datasetQuery = useAnalystDataset();
  const dataset = datasetQuery.data;

  if (datasetQuery.isError) {
    return (
      <StateNotice
        kind="error"
        title="Không tải được kho dữ liệu"
        description="Tài khoản Analyst chỉ được đọc API snapshot đã phát hành. Hãy kiểm tra quyền hoặc thử lại."
        actionLabel="Làm mới"
        onAction={() => {
          void datasetQuery.refetch();
        }}
      />
    );
  }

  if (datasetQuery.isLoading) {
    return <LinearProgress aria-label="Đang tải kho dữ liệu phân tích" />;
  }

  if (!dataset) {
    return (
      <StateNotice
        kind="empty"
        title="Chưa có dataset được phát hành"
        description="Analyst chưa có snapshot PUBLISHED để xem. DPO cần phát hành dataset sau verifier."
        actionLabel="Làm mới"
        onAction={() => {
          void datasetQuery.refetch();
        }}
      />
    );
  }

  return (
    <Stack spacing={4}>
      <SectionHeader
        eyebrow="Analyst workspace"
        title="Kho dữ liệu phân tích đã được phát hành"
        description="Analyst chỉ nhìn thấy snapshot PUBLISHED, preview đã xử lý và tác vụ mẫu đã qua hậu kiểm. Không có truy cập nguồn, staging hoặc chính sách DPO."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Chip label="PUBLISHED" color="success" sx={{ alignSelf: 'flex-start' }} />
              <Typography variant="h3">{dataset.datasetId}</Typography>
              <Typography color="text.secondary">{dataset.sourceName}</Typography>
              <Alert severity="info" icon={<VisibilityOffOutlinedIcon />}>
                Preview chỉ lấy từ output đã xử lý; raw source không đi qua giao diện Analyst.
              </Alert>
              <Stack spacing={1}>
                <InfoLine label="Published" value={dataset.publishedAt} />
                <InfoLine label="Trường đã loại" value={`${dataset.removedFields} trường`} />
                <InfoLine label="Tác vụ được phép" value={dataset.allowedTask} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" startIcon={<PlayArrowOutlinedIcon />}>
                  Chạy tác vụ mẫu
                </Button>
                <Button variant="outlined" startIcon={<RefreshOutlinedIcon />}>
                  Làm mới
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h4">Preview snapshot đã xử lý</Typography>
              <TableContainer>
                {dataset.previewRows.length === 0 ? (
                  <StateNotice
                    kind="empty"
                    title="Snapshot không có preview"
                    description="API không trả dòng đã xử lý nào; không hiển thị dữ liệu nguồn để thay thế."
                  />
                ) : (
                  <Table size="small" aria-label="Preview snapshot đã xử lý">
                    <TableHead>
                      <TableRow>
                        {Object.keys(dataset.previewRows[0] ?? {}).map((key) => (
                          <TableCell key={key}>{key}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dataset.previewRows.map((row) => (
                        <TableRow key={row.customer_key}>
                          {Object.entries(row).map(([key, value]) => (
                            <TableCell key={key}>{value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TableContainer>
              <Typography variant="h4">Kết quả tác vụ mẫu</Typography>
              <TableContainer>
                <Table size="small" aria-label="Kết quả tổng hợp">
                  <TableHead>
                    <TableRow>
                      <TableCell>Segment</TableCell>
                      <TableCell>Orders</TableCell>
                      <TableCell>Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataset.aggregateRows.map((row) => (
                      <TableRow key={row.segment}>
                        <TableCell>{row.segment}</TableCell>
                        <TableCell>{row.orders.toLocaleString('vi-VN')}</TableCell>
                        <TableCell>{row.revenue}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}

function InfoLine({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Stack>
  );
}
