import { useState } from 'react';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useSearchParams } from 'react-router-dom';
import { MascotLoader, SectionHeader, StateNotice } from '@/shared/ui';
import type { AuditEvent } from '../api/auditApi';
import { useAuditEvents } from '../hooks/useAuditLog';
import { AUDIT_FILTERS, type AuditFilterValue } from '../model/auditDescribe';
import { AuditActivityTable } from './AuditActivityTable';
import { AuditEventDrawer } from './AuditEventDrawer';
import { ChainStatusBanner } from './ChainStatusBanner';

const PAGE_SIZE = 50;
const MAX_LIMIT = 500;

function toFilter(raw: string | null): (typeof AUDIT_FILTERS)[number] {
  return AUDIT_FILTERS.find((item) => item.value === raw) ?? AUDIT_FILTERS[0];
}

export function AuditLogView(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const filter = toFilter(searchParams.get('group'));
  const limit = Math.min(Number(searchParams.get('limit')) || PAGE_SIZE, MAX_LIMIT);
  const { data: events, isLoading, isFetching, isError, error, refetch } = useAuditEvents({
    actions: filter.actions,
    limit,
  });

  const handleFilterChange = (value: AuditFilterValue): void => {
    setSearchParams(value === AUDIT_FILTERS[0].value ? {} : { group: value });
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
        title="Nhật ký hoạt động"
        description="Ai đã quét, duyệt, phát hành hay thu hồi dữ liệu gì và khi nào. Nhật ký chỉ được ghi thêm; không ai sửa hay xóa được một dòng mà không bị phát hiện."
      />

      <ChainStatusBanner />

      <Paper variant="outlined">
        <Tabs
          value={filter.value}
          onChange={(_, next: AuditFilterValue) => handleFilterChange(next)}
          variant="scrollable"
          aria-label="Nhóm hoạt động"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {AUDIT_FILTERS.map((item) => (
            <Tab key={item.value} value={item.value} label={item.label} />
          ))}
        </Tabs>

        {isLoading ? <MascotLoader compact title="Đang tải nhật ký…" /> : null}
        {isFetching && !isLoading ? <LinearProgress aria-label="Đang làm mới nhật ký" /> : null}
        {isError ? (
          <StateNotice
            kind="error"
            title="Không tải được nhật ký"
            description={error instanceof Error ? error.message : 'Vui lòng thử lại.'}
            actionLabel="Thử lại"
            onAction={() => void refetch()}
            bordered={false}
          />
        ) : null}
        {events && events.length === 0 ? (
          <StateNotice
            kind="empty"
            title="Chưa có hoạt động"
            description="Không có hoạt động nào trong nhóm này."
            bordered={false}
          />
        ) : null}

        {events && events.length > 0 ? <AuditActivityTable events={events} onSelect={setSelected} /> : null}

        {canLoadMore ? (
          <Stack alignItems="center" sx={{ p: 2 }}>
            <Button variant="outlined" onClick={handleLoadMore} disabled={isFetching}>
              Xem thêm
            </Button>
          </Stack>
        ) : null}
      </Paper>

      <AuditEventDrawer event={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </Stack>
  );
}
