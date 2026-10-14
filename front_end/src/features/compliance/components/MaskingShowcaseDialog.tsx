import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { MASKING_DEMO_ITEMS, type MaskingDemoItem } from '../model/maskingDemos';

export interface MaskingShowcaseDialogProps {
  open: boolean;
  onClose: () => void;
}

function TransformCard({
  label,
  value,
  color,
  badge,
  onCopy,
}: {
  label: string;
  value: string;
  color: string;
  badge: string;
  onCopy: (val: string) => void;
}): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderColor: color, bgcolor: 'background.paper', position: 'relative' }}>
      <Stack spacing={0.75}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ fontWeight: 700, color }}>
            {label}
          </Typography>
          <Chip label={badge} size="small" sx={{ height: 18, fontSize: '0.625rem' }} />
        </Stack>
        <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8125rem', wordBreak: 'break-all' }}>
          {value}
        </Box>
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="Sao chép giá trị">
            <IconButton size="small" onClick={() => onCopy(value)} aria-label={`Sao chép ${label}`}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function MaskingShowcaseDialog({ open, onClose }: MaskingShowcaseDialogProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string>('full-name');
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const selectedItem: MaskingDemoItem =
    MASKING_DEMO_ITEMS.find((item) => item.id === selectedId) ?? MASKING_DEMO_ITEMS[0]!;

  const handleCopy = (val: string): void => {
    void navigator.clipboard?.writeText(val);
    setCopyNotice('Đã sao chép vào bộ nhớ tạm!');
    setTimeout(() => setCopyNotice(null), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <VisibilityOffIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Demo Che Dữ Liệu — Đa Chiều (Masking Showcase)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Trực quan hóa cách biến đổi dữ liệu cá nhân theo từng phương pháp bảo mật
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Chọn loại dữ liệu cá nhân (PII Type):
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {MASKING_DEMO_ITEMS.map((item) => (
                <Chip
                  key={item.id}
                  label={item.dataTypeName.split('(')[0]}
                  onClick={() => setSelectedId(item.id)}
                  color={item.id === selectedId ? 'primary' : 'default'}
                  variant={item.id === selectedId ? 'filled' : 'outlined'}
                  clickable
                />
              ))}
            </Stack>
          </Box>

          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {selectedItem.dataTypeName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedItem.description}
                </Typography>
              </Box>
              <Chip label={`Cấp độ ${selectedItem.piiLevel}`} color={selectedItem.piiLevel === 'L3' ? 'error' : 'warning'} size="small" />
            </Stack>
          </Paper>

          {copyNotice && (
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              ✓ {copyNotice}
            </Typography>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TransformCard label="1. Dữ liệu gốc (RAW)" value={selectedItem.rawValue} color="error.main" badge="Nguy hiểm" onCopy={handleCopy} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TransformCard label="2. Che mờ định dạng (MASK)" value={selectedItem.maskValue} color="primary.main" badge="Bảo tồn format" onCopy={handleCopy} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TransformCard label="3. Mã băm bí mật (HMAC SHA-256)" value={selectedItem.hmacValue} color="success.main" badge={selectedItem.joinable ? 'Joinable (Bảo toàn khóa nối)' : 'Bảo mật tuyệt đối'} onCopy={handleCopy} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TransformCard label="4. Loại bỏ hoàn toàn (DROP)" value={selectedItem.dropValue} color="text.secondary" badge="Triệt tiêu cột" onCopy={handleCopy} />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.light', borderColor: 'primary.main' }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <SecurityIcon color="primary" sx={{ mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700 }}>
                  Cơ chế bảo vệ kỹ thuật
                </Typography>
                <Typography variant="body2" color="text.primary">
                  {selectedItem.algorithmNote}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained">
          Đóng Showcase
        </Button>
      </DialogActions>
    </Dialog>
  );
}
