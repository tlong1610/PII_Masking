import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { maskString, simulateHmacSha256 } from '../model/maskingDemos';
import { TransformResultCard } from './TransformResultCard';

/** Synthetic samples only (AGENT.md: never real personal data). */
const QUICK_SAMPLES = [
  { label: 'Họ tên', value: 'Nguyễn Văn A' },
  { label: 'Số điện thoại', value: '0900000001' },
  { label: 'Số CCCD', value: '001099000001' },
  { label: 'Địa chỉ Email', value: 'nguyenvana@example.com' },
  { label: 'Thẻ ngân hàng', value: '9704000000000001' },
] as const;

export function MaskingSandboxCard(): JSX.Element {
  const [inputValue, setInputValue] = useState<string>(QUICK_SAMPLES[0].value);
  const [copiedHmac, setCopiedHmac] = useState<boolean>(false);

  const hmac = simulateHmacSha256(inputValue);

  const handleCopyHmac = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(hmac);
      setCopiedHmac(true);
      setTimeout(() => setCopiedHmac(false), 2000);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <ScienceOutlinedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
                Thử nghiệm che dữ liệu
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Nhập một giá trị hoặc chọn mẫu giả lập để xem bốn cách xử lý thay đổi theo thời gian thực.
            </Typography>
          </Box>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'background.default' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                size="small"
                label="Giá trị thử nghiệm"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Họ tên, số điện thoại, email, CCCD…"
                inputProps={{ 'aria-label': 'Dữ liệu thử nghiệm' }}
                sx={{ flex: { md: '1 1 320px' }, minWidth: 0, bgcolor: 'background.paper' }}
              />
              <Stack direction="row" alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.5 }}>
                  Mẫu nhanh:
                </Typography>
                {QUICK_SAMPLES.map((sample) => {
                  const active = inputValue === sample.value;
                  return (
                    <Chip
                      key={sample.label}
                      label={sample.label}
                      size="small"
                      clickable
                      onClick={() => setInputValue(sample.value)}
                      variant={active ? 'filled' : 'outlined'}
                      color={active ? 'primary' : 'default'}
                      sx={{ fontWeight: active ? 700 : 500 }}
                    />
                  );
                })}
              </Stack>
            </Stack>
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
            <TransformResultCard
              tone="error"
              title="1. Dữ liệu gốc"
              badge="RAW · cấm phát hành"
              value={inputValue || '(trống)'}
              note="Chứa danh tính gốc; không bao giờ được đưa tới Analyst."
            />
            <TransformResultCard
              tone="primary"
              title="2. Che mờ"
              badge="MASK"
              value={maskString(inputValue)}
              note="Thay toàn bộ giá trị bằng *** (chuẩn MASK_PLACEHOLDER)."
            />
            <TransformResultCard
              tone="success"
              title="3. Băm mật mã"
              badge="HMAC · giữ khóa nối"
              value={`${hmac.slice(0, 10)}…${hmac.slice(-8)}`}
              action={
                <Tooltip title={copiedHmac ? 'Đã sao chép!' : 'Sao chép mã HMAC'}>
                  <IconButton size="small" onClick={handleCopyHmac} aria-label="Sao chép mã HMAC">
                    <ContentCopyIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              }
              note="Băm SHA-256 kèm khóa bí mật: vẫn JOIN được mà không lộ giá trị thật."
            />
            <TransformResultCard
              tone="neutral"
              title="4. Loại bỏ"
              badge="DROP"
              value="— cột bị loại bỏ —"
              note="Cột không xuất hiện trong schema và dữ liệu phát hành."
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
