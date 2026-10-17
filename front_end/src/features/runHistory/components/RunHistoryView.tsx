import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
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
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { ConfirmDialog, SectionHeader, StateNotice, useNotify } from '@/shared/ui';
import type { RunSummary } from '../api/runHistoryApi';
import { useDeleteRuns, useRunDatasetAction, useRunHistory, type DeleteRunsResult } from '../hooks/useRunHistory';
import { getRunDeleteBlocker, getRunTab, RUN_TABS, type RunTab } from '../model/runActions';
import { RunHistoryRow } from './RunHistoryRow';

function toTab(raw: string | null): RunTab {
  return RUN_TABS.find((tab) => tab.value === raw)?.value ?? 'ALL';
}

type DatasetAction = { kind: 'publish' | 'revoke'; run: RunSummary; datasetId: number };

const DATASET_ACTION_COPY = {
  publish: {
    title: (runId: number) => `Phát hành lượt quét #${runId}?`,
    description: 'Mọi Analyst sẽ xem được dữ liệu đã bảo vệ của lượt quét này. Muốn chỉnh sửa sau đó thì thu hồi trước.',
    confirm: 'Phát hành',
    done: (runId: number) => `Đã phát hành lượt quét #${runId}. Analyst có thể truy cập ngay.`,
  },
  revoke: {
    title: (runId: number) => `Thu hồi lượt quét #${runId}?`,
    description:
      'Analyst sẽ không xem được nữa và dữ liệu đã bảo vệ bị xóa. Quyết định được giữ nguyên: bạn có thể sửa, lưu và phát hành lại.',
    confirm: 'Thu hồi',
    done: (runId: number) => `Đã thu hồi lượt quét #${runId}.`,
  },
} as const;

export function RunHistoryView(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = toTab(searchParams.get('tab'));
  const { data: allRuns, isLoading, isError, error, refetch } = useRunHistory();
  const runs = useMemo(
    () => (tab === 'ALL' ? allRuns : allRuns?.filter((run) => getRunTab(run) === tab)),
    [allRuns, tab],
  );
  const tabCounts = useMemo(() => {
    const counts: Record<RunTab, number> = { ALL: allRuns?.length ?? 0, REVIEW: 0, READY: 0, PUBLISHED: 0, OTHER: 0 };
    allRuns?.forEach((run) => {
      counts[getRunTab(run)] += 1;
    });
    return counts;
  }, [allRuns]);
  const deleteRuns = useDeleteRuns();
  const datasetAction = useRunDatasetAction();
  const notify = useNotify();
  const [pendingAction, setPendingAction] = useState<DatasetAction | null>(null);
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

  const handleConfirmAction = (): void => {
    if (!pendingAction) return;
    const { kind, run, datasetId } = pendingAction;
    datasetAction.mutate(
      { kind, datasetId },
      {
        onSuccess: () => notify(DATASET_ACTION_COPY[kind].done(run.id)),
        onError: (err) => notify(err instanceof Error ? err.message : 'Thao tác thất bại.', 'error'),
        onSettled: () => setPendingAction(null),
      },
    );
  };

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
      <SectionHeader
        eyebrow="Lịch sử"
        title="Lịch sử lượt quét"
        description="Mọi lượt quét PII và dữ liệu đã bảo vệ của chúng. Tiếp tục duyệt, phát hành cho Analyst, thu hồi, hoặc xóa các lượt quét không còn dùng."
        actions={
          <Button component={RouterLink} to={routes.dpo} variant="contained" startIcon={<AddIcon />}>
            Quét mới
          </Button>
        }
      />

      {lastResult && lastResult.deleted.length > 0 ? (
        <Alert severity="success" onClose={() => setLastResult(null)}>
          Đã xóa {lastResult.deleted.length} lượt quét. Nhật ký kiểm toán của các lượt quét này vẫn được giữ.
        </Alert>
      ) : null}
      {lastResult && lastResult.failed.length > 0 ? (
        <Alert severity="error" onClose={() => setLastResult(null)}>
          {lastResult.failed.map((item) => `Lượt quét #${item.runId}: ${item.message}`).join(' · ')}
        </Alert>
      ) : null}

      <Paper variant="outlined">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
          sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tabs
            value={tab}
            onChange={(_, next: RunTab) => setSearchParams(next === 'ALL' ? {} : { tab: next })}
            variant="scrollable"
            aria-label="Lọc lượt quét"
          >
            {RUN_TABS.map((item) => (
              <Tab key={item.value} value={item.value} label={`${item.label} (${tabCounts[item.value]})`} />
            ))}
          </Tabs>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            disabled={selectedIds.length === 0 || deleteRuns.isPending}
            onClick={() => setPendingDelete(selectedIds)}
          >
            Xóa {selectedIds.length > 0 ? `${selectedIds.length} lượt quét đã chọn` : 'lượt quét đã chọn'}
          </Button>
        </Stack>

        {isLoading || deleteRuns.isPending || datasetAction.isPending ? (
          <LinearProgress aria-label="Đang tải lịch sử quét" />
        ) : null}
        {isError ? (
          <StateNotice
            kind="error"
            title="Không tải được lịch sử quét"
            description={error instanceof Error ? error.message : 'Vui lòng thử lại.'}
            actionLabel="Thử lại"
            onAction={() => void refetch()}
            bordered={false}
          />
        ) : null}
        {runs && runs.length === 0 ? (
          <StateNotice
            kind="empty"
            title={tab === 'ALL' ? 'Chưa có lượt quét nào' : 'Không có lượt quét nào ở mục này'}
            description={tab === 'ALL' ? 'Chọn một nguồn dữ liệu và bấm Bắt đầu quét.' : 'Chọn mục khác để xem.'}
            bordered={false}
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
                      inputProps={{ 'aria-label': 'Chọn tất cả lượt quét có thể xóa' }}
                    />
                  </TableCell>
                  <TableCell>Lượt quét</TableCell>
                  <TableCell>Nguồn</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Cột PII / tổng</TableCell>
                  <TableCell>Người tạo</TableCell>
                  <TableCell>Cập nhật</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run) => (
                  <RunHistoryRow
                    key={run.id}
                    run={run}
                    selected={selected.has(run.id)}
                    disabled={deleteRuns.isPending || datasetAction.isPending}
                    onToggle={toggle}
                    onDelete={(runId) => setPendingDelete([runId])}
                    onPublish={(item, datasetId) => setPendingAction({ kind: 'publish', run: item, datasetId })}
                    onRevoke={(item, datasetId) => setPendingAction({ kind: 'revoke', run: item, datasetId })}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Paper>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete && pendingDelete.length > 1 ? `Xóa ${pendingDelete.length} lượt quét?` : 'Xóa lượt quét?'}
        description={`Sẽ xóa vĩnh viễn ${
          pendingDelete && pendingDelete.length > 1 ? `${pendingDelete.length} lượt quét` : `lượt quét #${pendingDelete?.[0] ?? ''}`
        } cùng kết quả quét và quyết định. Nhật ký kiểm toán vẫn được giữ. Không thể hoàn tác.`}
        confirmLabel="Xóa vĩnh viễn"
        destructive
        pending={deleteRuns.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />

      {pendingAction && (
        <ConfirmDialog
          open
          title={DATASET_ACTION_COPY[pendingAction.kind].title(pendingAction.run.id)}
          description={DATASET_ACTION_COPY[pendingAction.kind].description}
          confirmLabel={DATASET_ACTION_COPY[pendingAction.kind].confirm}
          destructive={pendingAction.kind === 'revoke'}
          pending={datasetAction.isPending}
          onConfirm={handleConfirmAction}
          onClose={() => setPendingAction(null)}
        />
      )}
    </Stack>
  );
}
