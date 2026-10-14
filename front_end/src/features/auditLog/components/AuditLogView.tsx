import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { useSearchParams } from 'react-router-dom';
import { SectionHeader, StateNotice } from '@/shared/ui';
import { useAuditEvents } from '../hooks/useAuditLog';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, getAuditActionLabel } from '../model/auditLabels';
import { AuditEventsTable } from './AuditEventsTable';
import { ChainStatusBanner } from './ChainStatusBanner';

const PAGE_SIZE = 50;
const MAX_LIMIT = 500;

const ENTITY_LABELS: Record<(typeof AUDIT_ENTITY_TYPES)[number], string> = {
  run: 'Lượt quét',
  dataset: 'Dataset',
  source: 'Nguồn dữ liệu',
  session: 'Phiên đăng nhập',
};

export function AuditLogView(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action') ?? '';
  const entityType = searchParams.get('entity_type') ?? '';
  const limit = Math.min(Number(searchParams.get('limit')) || PAGE_SIZE, MAX_LIMIT);
  const { data: events, isLoading, isFetching, isError, error, refetch } = useAuditEvents({
    action: action || undefined,
    entityType: entityType || undefined,
    limit,
  });

  const updateParam = (key: string, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('limit');
    setSearchParams(next);
  };

  const handleLoadMore = (): void => {
    const next = new URLSearchParams(searchParams);
    next.set('limit', String(Math.min(limit + PAGE_SIZE, MAX_LIMIT)));
    setSearchParams(next);
  };

  const canLoadMore = events !== undefined && events.length >= limit && limit < MAX_LIMIT;

  return (
    <Stack spacing={3}>
      <SectionHeader
        eyebrow="Kiểm toán"
        title="Nhật ký kiểm toán"
        description="Mọi thao tác trên nguồn, lượt quét và dataset được ghi vào chuỗi hash chống chỉnh sửa. Chỉ chứa metadata, không chứa giá trị dữ liệu."
      />
      <ChainStatusBanner />
      <Paper variant="outlined">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="audit-action-filter">Hành động</InputLabel>
            <Select
              labelId="audit-action-filter"
              label="Hành động"
              value={action}
              onChange={(event) => updateParam('action', event.target.value)}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {AUDIT_ACTIONS.map((item) => (
                <MenuItem key={item} value={item}>
                  {getAuditActionLabel(item)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="audit-entity-filter">Đối tượng</InputLabel>
            <Select
              labelId="audit-entity-filter"
              label="Đối tượng"
              value={entityType}
              onChange={(event) => updateParam('entity_type', event.target.value)}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {AUDIT_ENTITY_TYPES.map((item) => (
                <MenuItem key={item} value={item}>
                  {ENTITY_LABELS[item]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {isLoading || isFetching ? <LinearProgress aria-label="Đang tải nhật ký" /> : null}
        {isError ? (
          <StateNotice
            kind="error"
            title="Không tải được nhật ký kiểm toán"
            description={error instanceof Error ? error.message : 'Vui lòng thử lại.'}
            actionLabel="Thử lại"
            onAction={() => void refetch()}
          />
        ) : null}
        {events && events.length === 0 ? (
          <StateNotice kind="empty" title="Không có sự kiện" description="Không có sự kiện nào khớp bộ lọc hiện tại." />
        ) : null}
        {events && events.length > 0 ? <AuditEventsTable events={events} /> : null}
        {canLoadMore ? (
          <Stack alignItems="center" sx={{ p: 2 }}>
            <Button variant="outlined" onClick={handleLoadMore} disabled={isFetching}>
              Tải thêm
            </Button>
          </Stack>
        ) : null}
      </Paper>
    </Stack>
  );
}
