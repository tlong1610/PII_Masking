import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import type { AuditEvent } from '../api/auditApi';
import { getAuditActionLabel, getAuditEntityLink, shortenHash } from '../model/auditLabels';

function EntityCell({ event }: { event: AuditEvent }): JSX.Element {
  const link = getAuditEntityLink(event.entity_type, event.entity_id);
  const label = `${event.entity_type} #${event.entity_id}`;
  if (!link) return <>{label}</>;
  const to = link.kind === 'run' ? routes.dpoRun(link.id) : routes.dpoDataset(link.id);
  return (
    <Link component={RouterLink} to={to}>
      {label}
    </Link>
  );
}

type AuditEventsTableProps = {
  events: AuditEvent[];
  /** Hides the entity column when the table is already scoped to one run/dataset. */
  showEntity?: boolean;
};

export function AuditEventsTable({ events, showEntity = true }: AuditEventsTableProps): JSX.Element {
  return (
    <TableContainer>
      <Table size="small" aria-label="Nhật ký kiểm toán">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Thời điểm</TableCell>
            <TableCell>Người thực hiện</TableCell>
            <TableCell>Hành động</TableCell>
            {showEntity ? <TableCell>Đối tượng</TableCell> : null}
            <TableCell>Ghi chú</TableCell>
            <TableCell>Hash</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell sx={{ fontFamily: 'monospace' }}>{event.id}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(event.created_at)}</TableCell>
              <TableCell>
                {event.actor_username ?? `#${event.actor_id}`}
                <Typography variant="caption" display="block" color="text.secondary">
                  {event.role}
                </Typography>
              </TableCell>
              <TableCell>{getAuditActionLabel(event.action)}</TableCell>
              {showEntity ? (
                <TableCell>
                  <EntityCell event={event} />
                </TableCell>
              ) : null}
              <TableCell sx={{ maxWidth: 280, overflowWrap: 'anywhere' }}>{event.reason || '—'}</TableCell>
              <TableCell>
                <Tooltip title={`entry ${event.entry_hash} · prev ${event.prev_hash}`}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {shortenHash(event.entry_hash)}
                  </Typography>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
