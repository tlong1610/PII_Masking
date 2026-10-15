import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import type { AuditEvent } from '../api/auditApi';
import { getAuditActionLabel } from '../model/auditLabels';

export interface BlockDetailDrawerProps {
  event: AuditEvent | null;
  open: boolean;
  onClose: () => void;
}

function HashField({ label, hash }: { label: string; hash: string }): JSX.Element {
  const handleCopy = (): void => {
    void navigator.clipboard?.writeText(hash);
  };

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Tooltip title="Sao chép toàn bộ mã SHA-256">
          <IconButton size="small" onClick={handleCopy} aria-label={`Sao chép ${label}`}>
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box
        sx={{
          p: 1.25,
          bgcolor: 'action.hover',
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          wordBreak: 'break-all',
          border: 1,
          borderColor: 'divider',
        }}
      >
        {hash}
      </Box>
    </Stack>
  );
}

export function BlockDetailDrawer({ event, open, onClose }: BlockDetailDrawerProps): JSX.Element {
  if (!event) return <></>;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}>
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LockOutlinedIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Chi tiết khối #{event.id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Bảo chứng mật mã Merkle Root & Hash-Chain
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Đóng chi tiết khối">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider />

        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {getAuditActionLabel(event.action)}
              </Typography>
              <Chip label={event.action} color="primary" size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {event.reason || 'Không có ghi chú thêm.'}
            </Typography>
          </Stack>
        </Paper>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Thông tin thực thi
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Thời điểm ghi nhận</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatDateTime(event.created_at)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Người thực hiện</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {event.actor_username ?? `#${event.actor_id}`} ({event.role})
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Đối tượng tác động</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {event.entity_type} #{event.entity_id}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <KeyOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Chuỗi băm mật mã (Cryptographic Hashes)
            </Typography>
          </Stack>
          <HashField label="Entry Hash / Block Hash (SHA-256)" hash={event.entry_hash} />
          <HashField label="Previous Hash (SHA-256)" hash={event.prev_hash} />
        </Stack>

        <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 1, border: 1, borderColor: 'primary.main' }}>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, display: 'block' }}>
            ✓ Tính toàn vẹn bất biến
          </Typography>
          <Typography variant="caption" color="text.primary">
            Khối này được neo chặt vào khối #{event.id > 1 ? event.id - 1 : 0} thông qua mã băm của khối trước. Bất kỳ sự thay đổi nào trên dữ liệu đều sẽ làm sai lệch toàn bộ chuỗi hash tiếp sau.
          </Typography>
        </Box>
      </Stack>
    </Drawer>
  );
}
