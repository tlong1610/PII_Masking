import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { ConfirmDialog, SectionHeader, StateNotice } from '@/shared/ui';
import { useDeleteRuns, useRunHistory, type DeleteRunsResult } from '../hooks/useRunHistory';
import { getRunDeleteBlocker, getRunStatusLabel, RUN_STATUSES, type RunStatus } from '../model/runActions';
import { RunHistoryRow } from './RunHistoryRow';

function toStatus(raw: string | null): RunStatus | undefined {
  return RUN_STATUSES.find((status) => status === raw);
}

export function RunHistoryView(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = toStatus(searchParams.get('status'));
  const { data: runs, isLoading, isError, error, refetch } = useRunHistory(status);
  const deleteRuns = useDeleteRuns();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);
  const [lastResult, setLastResult] = useState<DeleteRunsResult | null>(null);

  const deletableIds = useMemo(
    () => (runs ?? []).filter((run) => getRunDeleteBlocker(run) === null).map((run) => run.id),
    [runs],
  );
  // Only count selections still visible and deletable (the filter or data may have changed).
  const selectedIds = deletableIds.filter((id) => selected.has(id));
  const allSelected = deletableIds.length > 0 && selectedIds.length === deletableIds.length;

  const toggle = (runId: number): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  };

  const toggleAll = (): void => setSelected(allSelected ? new Set() : new Set(deletableIds));

  const handleConfirmDelete = (): void => {
    if (!pendingDelete) return;
    deleteRuns.mutate(pendingDelete, {
      onSuccess: (result) => {
        setLastResult(result);
        setSelected((current) => new Set([...current].filter((id) => !result.deleted.includes(id))));
      },
      onSettled: () => setPendingDelete(null),
    });
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'flex-end' }}>
        <SectionHeader
          eyebrow="Lịch sử"
          title="Lịch sử lượt quét"
          description="Mọi lượt quét PII đã chạy. Mở lại một run để tiếp tục duyệt, đi tới dataset của nó, hoặc xoá các run không còn dùng."
        />
        <Button component={RouterLink} to={routes.dpo} variant="contained" startIcon={<AddIcon />}>
          Quét mới
        </Button>
      </Stack>

      {lastResult && lastResult.deleted.length > 0 ? (
        <Alert severity="success" onClose={() => setLastResult(null)}>
          Đã xoá {lastResult.deleted.length} run. Nhật ký kiểm toán của các run này vẫn được giữ.
        </Alert>
      ) : null}
      {lastResult && lastResult.failed.length > 0 ? (
        <Alert severity="error" onClose={() => setLastResult(null)}>
          {lastResult.failed.map((item) => `Run #${item.runId}: ${item.message}`).join(' · ')}
        </Alert>
      ) : null}

      <Paper variant="outlined">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
          sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="run-status-filter">Trạng thái</InputLabel>
            <Select
              labelId="run-status-filter"
              label="Trạng thái"
              value={status ?? 'ALL'}
              onChange={(event) =>
                setSearchParams(event.target.value === 'ALL' ? {} : { status: event.target.value })
              }
            >
              <MenuItem value="ALL">Tất cả</MenuItem>
              {RUN_STATUSES.map((item) => (
                <MenuItem key={item} value={item}>
                  {getRunStatusLabel(item)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            disabled={selectedIds.length === 0 || deleteRuns.isPending}
            onClick={() => setPendingDelete(selectedIds)}
          >
            Xoá {selectedIds.length > 0 ? `${selectedIds.length} run đã chọn` : 'run đã chọn'}
          </Button>
        </Stack>

        {isLoading || deleteRuns.isPending ? <LinearProgress aria-label="Đang tải lịch sử quét" /> : null}
        {isError ? (
          <StateNotice
            kind="error"
            title="Không tải được lịch sử quét"
            description={error instanceof Error ? error.message : 'Vui lòng thử lại.'}
            actionLabel="Thử lại"
            onAction={() => void refetch()}
          />
        ) : null}
        {runs && runs.length === 0 ? (
          <StateNotice
            kind="empty"
            title="Chưa có lượt quét nào"
            description="Chọn một nguồn dữ liệu và bấm Quét PII để bắt đầu."
          />
        ) : null}
        {runs && runs.length > 0 ? (
          <TableContainer>
            <Table size="small" aria-label="Lịch sử lượt quét">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={selectedIds.length > 0 && !allSelected}
                      disabled={deletableIds.length === 0 || deleteRuns.isPending}
                      onChange={toggleAll}
                      inputProps={{ 'aria-label': 'Chọn tất cả run có thể xoá' }}
                    />
                  </TableCell>
                  <TableCell>Run</TableCell>
                  <TableCell>Nguồn</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Trường PII / tổng</TableCell>
                  <TableCell align="right">Đã quyết định</TableCell>
                  <TableCell>Người tạo</TableCell>
                  <TableCell>Cập nhật</TableCell>
                  <TableCell>Dataset</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run) => (
                  <RunHistoryRow
                    key={run.id}
                    run={run}
                    selected={selected.has(run.id)}
                    disabled={deleteRuns.isPending}
                    onToggle={toggle}
                    onDelete={(runId) => setPendingDelete([runId])}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Paper>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete && pendingDelete.length > 1 ? `Xoá ${pendingDelete.length} run?` : 'Xoá run?'}
        description={`Sẽ xoá vĩnh viễn ${
          pendingDelete && pendingDelete.length > 1 ? `${pendingDelete.length} run` : `run #${pendingDelete?.[0] ?? ''}`
        } cùng kết quả quét, quyết định và các dataset đã thu hồi/lỗi của chúng. Nhật ký kiểm toán vẫn được giữ. Không thể hoàn tác.`}
        confirmLabel="Xoá vĩnh viễn"
        destructive
        pending={deleteRuns.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Stack>
  );
}
