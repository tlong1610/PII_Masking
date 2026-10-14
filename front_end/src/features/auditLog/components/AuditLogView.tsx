import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { useSearchParams } from 'react-router-dom';
import { SectionHeader, StateNotice } from '@/shared/ui';
import type { AuditEvent } from '../api/auditApi';
import { useAuditEvents } from '../hooks/useAuditLog';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, getAuditActionLabel } from '../model/auditLabels';
import { AuditEventsTable } from './AuditEventsTable';
import { BlockDetailDrawer } from './BlockDetailDrawer';
import { ChainStatusBanner } from './ChainStatusBanner';
import { HashChainFlowView } from './HashChainFlowView';

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
  const [viewMode, setViewMode] = useState<'CHAIN' | 'TABLE'>('CHAIN');
  const [selectedBlock, setSelectedBlock] = useState<AuditEvent | null>(null);

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
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} spacing={2}>
        <SectionHeader
          eyebrow="Bảo chứng mật mã (Cryptographic Ledger)"
          title="Sổ cái Hash-Chain & Merkle Root"
          description="Toàn bộ thao tác quét, duyệt chính sách và phát hành dữ liệu được liên kết thành chuỗi băm bất biến SHA-256. Bất kỳ thay đổi nào cũng sẽ làm phá vỡ toàn bộ chuỗi."
        />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, next: 'CHAIN' | 'TABLE' | null) => next && setViewMode(next)}
          size="small"
          aria-label="Chế độ hiển thị sổ cái"
          sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
        >
          <ToggleButton value="CHAIN" aria-label="Xem dòng chảy chuỗi khối">
            <AccountTreeIcon fontSize="small" sx={{ mr: 1 }} /> Chuỗi khối (Chain)
          </ToggleButton>
          <ToggleButton value="TABLE" aria-label="Xem bảng sự kiện">
            <TableRowsIcon fontSize="small" sx={{ mr: 1 }} /> Bảng tra cứu (Table)
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

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

        {isLoading || isFetching ? <LinearProgress aria-label="Đang tải dữ liệu sổ cái" /> : null}
        {isError ? (
          <StateNotice
            kind="error"
            title="Không tải được sổ cái Hash-Chain"
            description={error instanceof Error ? error.message : 'Vui lòng thử lại.'}
            actionLabel="Thử lại"
            onAction={() => void refetch()}
          />
        ) : null}
        {events && events.length === 0 ? (
          <StateNotice kind="empty" title="Chưa có khối kiểm toán" description="Không có sự kiện nào khớp bộ lọc hiện tại." />
        ) : null}

        {events && events.length > 0 && viewMode === 'CHAIN' ? (
          <Box sx={{ p: 2, bgcolor: 'background.default' }}>
            <HashChainFlowView events={events} onSelectBlock={(e) => setSelectedBlock(e)} />
          </Box>
        ) : null}

        {events && events.length > 0 && viewMode === 'TABLE' ? (
          <AuditEventsTable events={events} />
        ) : null}

        {canLoadMore ? (
          <Stack alignItems="center" sx={{ p: 2 }}>
            <Button variant="outlined" onClick={handleLoadMore} disabled={isFetching}>
              Tải thêm khối
            </Button>
          </Stack>
        ) : null}
      </Paper>

      <BlockDetailDrawer event={selectedBlock} open={Boolean(selectedBlock)} onClose={() => setSelectedBlock(null)} />
    </Stack>
  );
}
