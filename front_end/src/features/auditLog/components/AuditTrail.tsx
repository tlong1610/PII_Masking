import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAuditEvents } from '../hooks/useAuditLog';
import { AuditEventsTable } from './AuditEventsTable';
import { ChainStatusBanner } from './ChainStatusBanner';

type AuditTrailProps = {
  entityType: 'run' | 'dataset';
  entityId: number;
};

/** Audit events of one run or dataset, plus the chain integrity check. */
export function AuditTrail({ entityType, entityId }: AuditTrailProps): JSX.Element {
  const { data: events, isLoading, isError, error } = useAuditEvents({
    entityType,
    entityId: String(entityId),
    limit: 100,
  });

  return (
    <Stack spacing={2}>
      <ChainStatusBanner />
      {isLoading ? <LinearProgress aria-label="Đang tải nhật ký" /> : null}
      {isError ? (
        <Alert severity="error">{error instanceof Error ? error.message : 'Không tải được nhật ký.'}</Alert>
      ) : null}
      {events && events.length === 0 ? (
        <Typography color="text.secondary">Chưa có sự kiện nào cho {entityType} #{entityId}.</Typography>
      ) : null}
      {events && events.length > 0 ? <AuditEventsTable events={events} showEntity={false} /> : null}
    </Stack>
  );
}
