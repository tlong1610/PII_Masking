import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import { ConfirmDialog } from '@/shared/ui';
import type { DatasetGrant } from '../api/datasetsApi';
import {
  useAnalysts,
  useDatasetGrants,
  useGrantDatasetAccess,
  useRevokeDatasetAccess,
} from '../hooks/useDatasets';

type DatasetGrantsPanelProps = {
  datasetId: number;
  /** False once the snapshot is revoked/failed: grants are shown read-only. */
  editable: boolean;
};

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : 'Thao tác thất bại. Vui lòng thử lại.';
}

/** Who may read a dataset: list, grant to an Analyst, revoke a grant (DPO only). */
export function DatasetGrantsPanel({ datasetId, editable }: DatasetGrantsPanelProps): JSX.Element {
  const { data: grants, isLoading } = useDatasetGrants(datasetId);
  const { data: analysts } = useAnalysts();
  const grantAccess = useGrantDatasetAccess(datasetId);
  const revokeAccess = useRevokeDatasetAccess(datasetId);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [pendingRevoke, setPendingRevoke] = useState<DatasetGrant | null>(null);

  const grantableAnalysts = useMemo(() => {
    const granted = new Set((grants ?? []).map((grant) => grant.user_id));
    return (analysts ?? []).filter((analyst) => !granted.has(analyst.id));
  }, [analysts, grants]);

  const handleGrant = (): void => {
    if (selectedUserId === '') return;
    grantAccess.mutate(selectedUserId, { onSuccess: () => setSelectedUserId('') });
  };

  const handleConfirmRevoke = (): void => {
    if (!pendingRevoke) return;
    revokeAccess.mutate(pendingRevoke.user_id, { onSettled: () => setPendingRevoke(null) });
  };

  const actionError = errorMessage(grantAccess.error) ?? errorMessage(revokeAccess.error);

  return (
    <Stack spacing={2}>
      {editable ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id={`grant-user-${datasetId}`}>Cấp quyền cho Analyst</InputLabel>
            <Select
              labelId={`grant-user-${datasetId}`}
              label="Cấp quyền cho Analyst"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value === '' ? '' : Number(event.target.value))}
            >
              {grantableAnalysts.length === 0 ? (
                <MenuItem value="" disabled>
                  Tất cả Analyst đã có quyền
                </MenuItem>
              ) : null}
              {grantableAnalysts.map((analyst) => (
                <MenuItem key={analyst.id} value={analyst.id}>
                  {analyst.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleGrant} disabled={selectedUserId === '' || grantAccess.isPending}>
            Cấp quyền
          </Button>
        </Stack>
      ) : (
        <Alert severity="info">Dataset không còn snapshot hợp lệ nên không thể cấp thêm quyền.</Alert>
      )}

      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      {isLoading ? <LinearProgress aria-label="Đang tải danh sách quyền" /> : null}

      {grants && grants.length === 0 ? (
        <Typography color="text.secondary">
          Chưa Analyst nào được cấp quyền. Khi phát hành, hệ thống tự cấp quyền cho các Analyst hiện có.
        </Typography>
      ) : null}

      {grants && grants.length > 0 ? (
        <Table size="small" aria-label="Danh sách quyền truy cập dataset">
          <TableHead>
            <TableRow>
              <TableCell>Người dùng</TableCell>
              <TableCell>Quyền</TableCell>
              <TableCell>Cấp lúc</TableCell>
              {editable ? <TableCell align="right">Thao tác</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {grants.map((grant) => (
              <TableRow key={grant.id}>
                <TableCell sx={{ fontWeight: 600 }}>{grant.username ?? `Người dùng #${grant.user_id}`}</TableCell>
                <TableCell>Chỉ đọc dữ liệu đã bảo vệ</TableCell>
                <TableCell>{formatDateTime(grant.created_at)}</TableCell>
                {editable ? (
                  <TableCell align="right">
                    <Button size="small" color="error" onClick={() => setPendingRevoke(grant)}>
                      Thu hồi quyền
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <ConfirmDialog
        open={pendingRevoke !== null}
        title="Thu hồi quyền truy cập?"
        description={`${pendingRevoke?.username ?? 'Người dùng này'} sẽ không còn xem được dataset này.`}
        confirmLabel="Thu hồi quyền"
        destructive
        pending={revokeAccess.isPending}
        onConfirm={handleConfirmRevoke}
        onClose={() => setPendingRevoke(null)}
      />
    </Stack>
  );
}
