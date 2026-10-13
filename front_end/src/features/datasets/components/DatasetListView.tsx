import Link from '@mui/material/Link';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import { SectionHeader, StateNotice } from '@/shared/ui';
import { useDatasetList } from '../hooks/useDatasets';
import { parseSnapshotLocation } from '../model/datasetRules';
import type { DatasetStatus } from '../model/types';
import { DatasetStatusBadge } from './DatasetStatusBadge';

const FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'VERIFIED', label: 'Chờ phát hành' },
  { value: 'PUBLISHED', label: 'Đã phát hành' },
  { value: 'REVOKED', label: 'Đã thu hồi' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

function toFilter(raw: string | null): Filter {
  return FILTERS.find((item) => item.value === raw)?.value ?? 'ALL';
}

export function DatasetListView(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = toFilter(searchParams.get('status'));
  const status: DatasetStatus | undefined = filter === 'ALL' ? undefined : filter;
  const { data: datasets, isLoading, isError, error, refetch } = useDatasetList(status);

  const handleFilterChange = (next: Filter): void => {
    setSearchParams(next === 'ALL' ? {} : { status: next });
  };

  return (
    <Stack spacing={3}>
      <SectionHeader
        eyebrow="Quản lý dữ liệu đã bảo vệ"
        title="Dataset đã bảo vệ"
        description="Các snapshot đã được bảo vệ (MASK / HMAC / DROP) và kiểm định. Phát hành để Analyst sử dụng, hoặc thu hồi để xoá snapshot vật lý."
      />
      <Paper variant="outlined">
        <Tabs
          value={filter}
          onChange={(_, next: Filter) => handleFilterChange(next)}
          aria-label="Lọc theo trạng thái dataset"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {FILTERS.map((item) => (
            <Tab key={item.value} value={item.value} label={item.label} />
          ))}
        </Tabs>
        {isLoading ? <LinearProgress aria-label="Đang tải danh sách dataset" /> : null}
        {isError ? (
          <StateNotice
            kind="error"
            title="Không tải được danh sách dataset"
            description={error instanceof Error ? error.message : 'Vui lòng thử lại.'}
            actionLabel="Thử lại"
            onAction={() => void refetch()}
          />
        ) : null}
        {datasets && datasets.length === 0 ? (
          <StateNotice
            kind="empty"
            title="Chưa có dataset nào"
            description="Quét một nguồn dữ liệu, duyệt quyết định và tạo snapshot để dataset xuất hiện tại đây."
          />
        ) : null}
        {datasets && datasets.length > 0 ? (
          <TableContainer>
            <Table size="small" aria-label="Danh sách dataset">
              <TableHead>
                <TableRow>
                  <TableCell>Dataset</TableCell>
                  <TableCell>Nguồn</TableCell>
                  <TableCell>Run</TableCell>
                  <TableCell>Snapshot</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Analyst được cấp quyền</TableCell>
                  <TableCell>Tạo lúc</TableCell>
                  <TableCell>Phát hành / thu hồi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datasets.map((dataset) => {
                  const location = parseSnapshotLocation(dataset.output_location);
                  return (
                    <TableRow key={dataset.id} hover>
                      <TableCell>
                        <Link component={RouterLink} to={routes.dpoDataset(dataset.id)} fontWeight={600}>
                          {dataset.dataset_name}
                        </Link>
                        <Typography variant="caption" display="block" color="text.secondary">
                          #{dataset.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {dataset.source_name ?? '—'}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {dataset.engine ?? ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Link component={RouterLink} to={routes.dpoRun(dataset.run_id)}>
                          #{dataset.run_id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {location.engine}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {location.tables.length > 0 ? `${location.tables.length} bảng` : 'Không có snapshot vật lý'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <DatasetStatusBadge status={dataset.status} />
                      </TableCell>
                      <TableCell align="right">{dataset.grant_count ?? 0}</TableCell>
                      <TableCell>{formatDateTime(dataset.created_at)}</TableCell>
                      <TableCell>{formatDateTime(dataset.revoked_at ?? dataset.published_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Paper>
    </Stack>
  );
}
