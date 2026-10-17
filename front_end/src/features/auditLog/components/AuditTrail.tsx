import { useState } from 'react';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { AuditEvent } from '../api/auditApi';
import { useAuditEvents } from '../hooks/useAuditLog';
import { AuditActivityTable } from './AuditActivityTable';
import { AuditEventDrawer } from './AuditEventDrawer';
import { ChainStatusBanner } from './ChainStatusBanner';

type AuditTrailProps = {
  runId: number;
};

/** Everything that happened to one run (scan, saves, publish, revoke), plus the integrity check. */
export function AuditTrail({ runId }: AuditTrailProps): JSX.Element {
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const { data: events, isLoading, isError, error } = useAuditEvents({ runId, limit: 200 });

  return (
    <Stack spacing={2}>
      <ChainStatusBanner />
      {isLoading ? <LinearProgress aria-label="Đang tải nhật ký" /> : null}
      {isError ? (
        <Alert severity="error">{error instanceof Error ? error.message : 'Không tải được nhật ký.'}</Alert>
      ) : null}
      {events && events.length === 0 ? (
        <Typography color="text.secondary">Chưa có hoạt động nào cho lượt quét này.</Typography>
      ) : null}
      {events && events.length > 0 ? (
        <Paper variant="outlined">
          <AuditActivityTable events={events} showSubject={false} onSelect={setSelected} />
        </Paper>
      ) : null}
      <AuditEventDrawer event={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </Stack>
  );
}
