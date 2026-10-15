import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import type { AuditEvent } from '../api/auditApi';
import { getAuditActionLabel, shortenHash } from '../model/auditLabels';

export interface HashChainFlowViewProps {
  events: AuditEvent[];
  onSelectBlock: (event: AuditEvent) => void;
}

function BlockCard({
  event,
  isLast,
  onSelect,
}: {
  event: AuditEvent;
  isLast: boolean;
  onSelect: (event: AuditEvent) => void;
}): JSX.Element {
  return (
    <Stack alignItems="center" spacing={1} sx={{ width: '100%' }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          width: '100%',
          maxWidth: 720,
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 2,
          },
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}
              >
                KHỐI #{event.id}
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {getAuditActionLabel(event.action)}
              </Typography>
              <Chip label={event.action} size="small" variant="outlined" color="primary" />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(event.created_at)}
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {event.reason || `Thực thi thao tác trên ${event.entity_type} #${event.entity_id}.`}
          </Typography>

          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Prev Hash:
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 0.5 }}>
                  {shortenHash(event.prev_hash)}
                </Typography>
                <Typography variant="caption" color="text.secondary">→</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Entry Hash:
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'primary.light', color: 'primary.main', fontWeight: 700, px: 0.75, py: 0.25, borderRadius: 0.5 }}>
                  {shortenHash(event.entry_hash)}
                </Typography>
              </Stack>
              <Button size="small" variant="text" startIcon={<LockOutlinedIcon fontSize="small" />} onClick={() => onSelect(event)}>
                Xem băm SHA-256
              </Button>
            </Stack>
          </Paper>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Người phê duyệt: <strong>{event.actor_username ?? `#${event.actor_id}`}</strong> ({event.role})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Đối tượng: <strong>{event.entity_type} #{event.entity_id}</strong>
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {!isLast && (
        <Stack alignItems="center" sx={{ py: 0.5 }}>
          <ArrowDownwardIcon color="action" fontSize="small" />
        </Stack>
      )}
    </Stack>
  );
}

export function HashChainFlowView({ events, onSelectBlock }: HashChainFlowViewProps): JSX.Element {
  return (
    <Stack spacing={1} alignItems="center" sx={{ py: 2 }}>
      {events.map((event, index) => (
        <BlockCard key={event.id} event={event} isLast={index === events.length - 1} onSelect={onSelectBlock} />
      ))}
    </Stack>
  );
}
