import { useState, type PropsWithChildren } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import { ConfirmDialog, StateNotice } from '@/shared/ui';
import { useDatasetDetail, usePublishDataset, useRevokeDataset } from '../hooks/useDatasets';
import { canManageGrants, canPublish, canRevoke, parseSnapshotLocation } from '../model/datasetRules';
import { DatasetGrantsPanel } from './DatasetGrantsPanel';
import { DatasetPreviewTable } from './DatasetPreviewTable';
import { DatasetStatusBadge } from './DatasetStatusBadge';
import { VerifierResultsTable } from './VerifierResultsTable';

function Section({ title, children }: PropsWithChildren<{ title: string }>): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function Fact({ label, children }: PropsWithChildren<{ label: string }>): JSX.Element {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography component="div">{children}</Typography>
    </Stack>
  );
}

export function DatasetDetailView({ datasetId }: { datasetId: number }): JSX.Element {
  const { data: dataset, isLoading, isError, error, refetch } = useDatasetDetail(datasetId);
  const publish = usePublishDataset();
  const revoke = useRevokeDataset();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  if (isLoading) return <LinearProgress aria-label="Đang tải dataset" />;
  if (isError || !dataset) {
    return (
      <StateNotice
        kind="error"
        title="Không tải được dataset"
        description={error instanceof Error ? error.message : 'Dataset không tồn tại.'}
        actionLabel="Thử lại"
        onAction={() => void refetch()}
      />
    );
  }

  const location = parseSnapshotLocation(dataset.output_location);
  const actionError = publish.error ?? revoke.error;

  return (
    <Stack spacing={3}>
      <Link component={RouterLink} to={routes.dpoDatasets} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <ArrowBackIcon fontSize="small" /> Danh sách dataset
      </Link>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
        <Stack spacing={1}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h2" component="h1">
              {dataset.dataset_name}
            </Typography>
            <DatasetStatusBadge status={dataset.status} />
          </Stack>
          <Typography color="text.secondary">
            Dataset #{dataset.id} · từ{' '}
            <Link component={RouterLink} to={routes.dpoRun(dataset.run_id)}>
              run #{dataset.run_id}
            </Link>{' '}
            · {dataset.source_name ?? 'nguồn không xác định'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          {canPublish(dataset.status) ? (
            <Button variant="contained" color="success" onClick={() => publish.mutate(dataset.id)} disabled={publish.isPending}>
              Phát hành cho Analyst
            </Button>
          ) : null}
          {canRevoke(dataset.status) ? (
            <Button variant="outlined" color="error" onClick={() => setConfirmRevoke(true)} disabled={revoke.isPending}>
              Thu hồi
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {actionError ? (
        <Alert severity="error">{actionError instanceof Error ? actionError.message : 'Thao tác thất bại.'}</Alert>
      ) : null}

      <Section title="Tổng quan">
        <Stack direction="row" flexWrap="wrap" gap={3}>
          <Fact label="Snapshot">
            {location.engine}
            {location.engine !== 'Demo' ? ` · ${location.container}` : ' · không có snapshot vật lý'}
            {location.dropped ? ' (đã xoá)' : ''}
          </Fact>
          <Fact label="Bảng / collection">{location.tables.length > 0 ? location.tables.join(', ') : '—'}</Fact>
          <Fact label="Tạo lúc">{formatDateTime(dataset.created_at)}</Fact>
          <Fact label="Phát hành lúc">{formatDateTime(dataset.published_at)}</Fact>
          <Fact label="Thu hồi lúc">{formatDateTime(dataset.revoked_at)}</Fact>
          <Fact label="Analyst được cấp quyền">{dataset.grant_count ?? 0}</Fact>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          {Object.entries(dataset.action_counts).map(([action, count]) => (
            <Chip key={action} label={`${action}: ${count} cột`} size="small" variant="outlined" />
          ))}
        </Stack>
      </Section>

      <Section title="Kiểm định downstream">
        <VerifierResultsTable results={dataset.verifier_results} />
      </Section>

      <Section title="Xem trước dữ liệu đã bảo vệ">
        <DatasetPreviewTable datasetId={dataset.id} available={canRevoke(dataset.status)} />
      </Section>

      <Section title="Quyền truy cập">
        <DatasetGrantsPanel datasetId={dataset.id} editable={canManageGrants(dataset.status)} />
      </Section>

      <ConfirmDialog
        open={confirmRevoke}
        title="Thu hồi dataset?"
        description="Snapshot vật lý sẽ bị xoá (DROP schema / database) và mọi quyền của Analyst bị huỷ. Không thể hoàn tác."
        confirmLabel="Thu hồi và xoá snapshot"
        destructive
        pending={revoke.isPending}
        onConfirm={() => revoke.mutate(dataset.id, { onSettled: () => setConfirmRevoke(false) })}
        onClose={() => setConfirmRevoke(false)}
      />
    </Stack>
  );
}
