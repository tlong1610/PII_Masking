import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { StatusChip } from '@/shared/ui';
import { DETAIL_DRAWER_WIDTH } from '@/shared/config/layout';
import { Link as RouterLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import type { AuditEvent } from '../api/auditApi';
import { describeAuditEvent, getPolicyLabel, type DecisionChange } from '../model/auditDescribe';

export interface AuditEventDrawerProps {
  event: AuditEvent | null;
  open: boolean;
  onClose: () => void;
}

function Fact({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {children}
      </Typography>
    </Stack>
  );
}

function Expandable({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Button
        size="small"
        color="inherit"
        onClick={() => setOpen((current) => !current)}
        endIcon={<ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />}
        aria-expanded={open}
        sx={{ px: 0, fontWeight: 600 }}
      >
        {title}
      </Button>
      <Collapse in={open}>
        <Box sx={{ pt: 1 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

function HashField({ label, hash }: { label: string; hash: string }): JSX.Element {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Tooltip title="Sao chép">
          <IconButton size="small" onClick={() => void navigator.clipboard?.writeText(hash)} aria-label={`Sao chép ${label}`}>
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box
        sx={{
          p: 1,
          bgcolor: 'action.hover',
          borderRadius: 1,
          fontFamily: 'monospace',
          typography: 'caption',
          wordBreak: 'break-all',
        }}
      >
        {hash}
      </Box>
    </Stack>
  );
}

function ChangesTable({ changes }: { changes: DecisionChange[] }): JSX.Element {
  const edited = changes.filter((change) => change.from !== null && change.from !== change.to);
  const [showAll, setShowAll] = useState(edited.length === 0);
  const rows = showAll ? changes : edited;

  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {showAll ? `Quyết định của ${changes.length} cột` : `${edited.length} cột đã đổi`}
        </Typography>
        {edited.length > 0 && edited.length < changes.length && (
          <Button size="small" onClick={() => setShowAll((current) => !current)}>
            {showAll ? 'Chỉ cột đã đổi' : `Xem cả ${changes.length} cột`}
          </Button>
        )}
      </Stack>
      <Box sx={{ maxHeight: 360, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Cột</TableCell>
              <TableCell>Trước</TableCell>
              <TableCell>Sau</TableCell>
              <TableCell>Lý do</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((change) => (
              <TableRow key={change.column}>
                <TableCell sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{change.column}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{change.from === null ? 'Mới' : getPolicyLabel(change.from)}</TableCell>
                <TableCell sx={{ fontWeight: change.from !== null && change.from !== change.to ? 700 : 400 }}>
                  {getPolicyLabel(change.to)}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>{change.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}

/** One activity in plain words; the raw note and the tamper-proof hashes stay one click away. */
export function AuditEventDrawer({ event, open, onClose }: AuditEventDrawerProps): JSX.Element {
  if (!event) return <></>;
  const description = describeAuditEvent(event);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: DETAIL_DRAWER_WIDTH }, p: 3 } }}>
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack spacing={1}>
            <Stack direction="row">
              <StatusChip label={description.title} tone={description.tone} />
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {description.summary}
            </Typography>
          </Stack>
          <IconButton onClick={onClose} aria-label="Đóng chi tiết">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={1}>
          <Fact label="Thời điểm">{formatDateTime(event.created_at)}</Fact>
          <Fact label="Người thực hiện">
            {event.actor_username ?? `#${event.actor_id}`} ({event.role})
          </Fact>
          {event.run_id ? (
            <Fact label="Lượt quét">
              <Link component={RouterLink} to={routes.dpoRun(event.run_id)} onClick={onClose}>
                Lượt quét #{event.run_id}
              </Link>
              {event.source_name ? ` · ${event.source_name}` : ''}
            </Fact>
          ) : event.entity_type === 'source' ? (
            <Fact label="Nguồn dữ liệu">{event.source_name ?? 'Đã xóa'}</Fact>
          ) : null}
        </Stack>

        {description.changes.length > 0 && <ChangesTable changes={description.changes} />}

        <Divider />

        <Expandable title="Ghi chú gốc của hệ thống">
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
            {event.reason || 'Không có ghi chú.'}
          </Typography>
        </Expandable>

        <Expandable title="Bằng chứng chống sửa">
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <VerifiedUserOutlinedIcon fontSize="small" color="success" />
              <Typography variant="body2" color="text.secondary">
                Mỗi hoạt động được khóa bằng một mã băm SHA-256 tính từ nội dung của nó và mã của hoạt động liền trước.
                Sửa hay xóa bất kỳ dòng nào trong nhật ký sẽ làm các mã không còn khớp và bị phát hiện ngay.
              </Typography>
            </Stack>
            <HashField label={`Mã của hoạt động #${event.id}`} hash={event.entry_hash} />
            <HashField label="Mã của hoạt động liền trước" hash={event.prev_hash} />
          </Stack>
        </Expandable>
      </Stack>
    </Drawer>
  );
}
