import { Fragment, useMemo } from 'react';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link as RouterLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import type { AuditEvent } from '../api/auditApi';
import { formatTime, groupByDay } from '../model/activityGroups';
import { describeAuditEvent } from '../model/auditDescribe';

function Subject({ event }: { event: AuditEvent }): JSX.Element {
  if (event.run_id) {
    return (
      <>
        <Link
          component={RouterLink}
          to={routes.dpoRun(event.run_id)}
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          fontWeight={600}
        >
          Run #{event.run_id}
        </Link>
        {event.source_name && (
          <Typography variant="caption" display="block" color="text.secondary">
            {event.source_name}
          </Typography>
        )}
      </>
    );
  }
  if (event.entity_type === 'source') return <>{event.source_name ?? 'Nguồn đã xoá'}</>;
  if (event.entity_type === 'run' || event.entity_type === 'dataset') {
    return <Typography variant="body2" color="text.secondary">Lượt quét đã xoá</Typography>;
  }
  return <Typography variant="body2" color="text.secondary">—</Typography>;
}

type AuditActivityTableProps = {
  events: AuditEvent[];
  /** Hides the subject column when the list is already scoped to one run. */
  showSubject?: boolean;
  onSelect: (event: AuditEvent) => void;
};

/** Activity log grouped by day, one plain-language sentence per event; details open on click. */
export function AuditActivityTable({ events, showSubject = true, onSelect }: AuditActivityTableProps): JSX.Element {
  const groups = useMemo(() => groupByDay(events), [events]);
  const columns = showSubject ? 6 : 5;

  return (
    <TableContainer>
      <Table size="small" aria-label="Nhật ký hoạt động" sx={{ tableLayout: 'fixed', minWidth: 760 }}>
        <colgroup>
          <col style={{ width: 72 }} />
          <col style={{ width: 200 }} />
          <col />
          {showSubject && <col style={{ width: 170 }} />}
          <col style={{ width: 110 }} />
          <col style={{ width: 40 }} />
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell>Giờ</TableCell>
            <TableCell>Hoạt động</TableCell>
            <TableCell>Nội dung</TableCell>
            {showSubject && <TableCell>Lượt quét / nguồn</TableCell>}
            <TableCell>Người thực hiện</TableCell>
            <TableCell aria-label="Xem chi tiết" />
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              <TableRow>
                <TableCell colSpan={columns} sx={{ bgcolor: 'background.default', py: 0.75 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {group.label}
                  </Typography>
                </TableCell>
              </TableRow>
              {group.items.map((event) => {
                const description = describeAuditEvent(event);
                return (
                  <TableRow
                    key={event.id}
                    hover
                    tabIndex={0}
                    onClick={() => onSelect(event)}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Enter') onSelect(event);
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(event.created_at)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={description.tone}
                        label={description.title}
                        sx={{ fontWeight: 600, maxWidth: '100%' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                        {description.summary}
                      </Typography>
                    </TableCell>
                    {showSubject && (
                      <TableCell>
                        <Subject event={event} />
                      </TableCell>
                    )}
                    <TableCell>{event.actor_username ?? `#${event.actor_id}`}</TableCell>
                    <TableCell padding="none">
                      <ChevronRightIcon fontSize="small" color="action" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
