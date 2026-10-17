import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { maskString, simulateHmacSha256 } from '../model/maskingDemos';

const QUICK_SAMPLES = [
  { label: 'Họ tên', value: 'Nguyễn Văn Phúc' },
  { label: 'Số điện thoại', value: '0912345678' },
  { label: 'Số CCCD', value: '079095012345' },
  { label: 'Địa chỉ Email', value: 'phuc.nguyen@enterprise.vn' },
  { label: 'Thẻ ngân hàng', value: '9704123456789012' },
] as const;

export function MaskingSandboxCard(): JSX.Element {
  const [inputValue, setInputValue] = useState<string>('Nguyễn Văn Phúc');
  const [copiedHmac, setCopiedHmac] = useState<boolean>(false);

  const masked = maskString(inputValue);
  const hmac = simulateHmacSha256(inputValue);

  const handleCopyHmac = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(hmac);
      setCopiedHmac(true);
      setTimeout(() => setCopiedHmac(false), 2000);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          {/* Header */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <PlayArrowIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Hộp Thử Nghiệm Che Mờ Tương Tác (Live Sandbox)
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Nhập giá trị bất kỳ hoặc chọn mẫu bên dưới để xem dữ liệu biến đổi theo thời gian thực:
            </Typography>
          </Box>

          {/* Balanced Control Bar */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 4 },
              borderRadius: 1.5,
              bgcolor: 'background.default',
            }}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', lg: 'center' }}
              justifyContent="space-between"
            >
              <TextField
                size="small"
                label="Dữ liệu thử nghiệm (Input Value)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập họ tên, số điện thoại, email, cccd..."
                inputProps={{ 'aria-label': 'Dữ liệu thử nghiệm' }}
                sx={{
                  minWidth: { xs: '100%', sm: 340, md: 420 },
                  bgcolor: 'background.paper',
                }}
              />

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  Mẫu nhanh:
                </Typography>
                {QUICK_SAMPLES.map((sample) => (
                  <Chip
                    key={sample.label}
                    label={sample.label}
                    size="small"
                    onClick={() => setInputValue(sample.value)}
                    variant={inputValue === sample.value ? 'filled' : 'outlined'}
                    color={inputValue === sample.value ? 'primary' : 'default'}
                    clickable
                    sx={{ fontWeight: inputValue === sample.value ? 700 : 500, height: 26 }}
                  />
                ))}
              </Stack>
            </Stack>
          </Paper>

          {/* Balanced 4 Transformation Cards */}
          <Grid container spacing={2}>
            {/* Card 1: RAW */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 1.5,
                  borderColor: 'error.main',
                  bgcolor: 'error.light',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>
                      1. GỐC (RAW)
                    </Typography>
                    <Chip label="Cấm lưu thô" color="error" size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 600 }} />
                  </Stack>

                  <Box
                    sx={{
                      minHeight: 52,
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'error.light',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: 'error.dark',
                        wordBreak: 'break-all',
                        lineHeight: 1.3,
                      }}
                    >
                      {inputValue || '(Trống)'}
                    </Typography>
                  </Box>
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, minHeight: 34 }}>
                  Chứa toàn bộ danh tính gốc, vi phạm sàn bảo mật nếu xuất bản ra Analyst.
                </Typography>
              </Paper>
            </Grid>

            {/* Card 2: MASK *** */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 1.5,
                  borderColor: 'primary.main',
                  bgcolor: 'primary.light',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      2. CHE MỜ (MASK ***)
                    </Typography>
                    <Chip label="Chuẩn MASK ***" color="primary" size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 600 }} />
                  </Stack>

                  <Box
                    sx={{
                      minHeight: 52,
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: 'primary.dark',
                        letterSpacing: 2,
                      }}
                    >
                      {masked}
                    </Typography>
                  </Box>
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, minHeight: 34 }}>
                  Thay thế bằng ký tự đại diện (***), giấu hoàn toàn dữ liệu theo chuẩn MASK_PLACEHOLDER.
                </Typography>
              </Paper>
            </Grid>

            {/* Card 3: HMAC */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 1.5,
                  borderColor: 'success.main',
                  bgcolor: 'success.light',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>
                      3. BĂM MẬT MÃ (HMAC)
                    </Typography>
                    <Chip label="Joinable (Khóa nối)" color="success" size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 600 }} />
                  </Stack>

                  <Box
                    sx={{
                      minHeight: 52,
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Tooltip title={`Mã HMAC SHA-256 đầy đủ: ${hmac}`}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'success.dark',
                          wordBreak: 'break-all',
                          fontSize: '0.75rem',
                          lineHeight: 1.2,
                        }}
                      >
                        {hmac.slice(0, 10)}...{hmac.slice(-8)}
                      </Typography>
                    </Tooltip>
                    <Tooltip title={copiedHmac ? 'Đã sao chép!' : 'Sao chép mã HMAC'}>
                      <IconButton size="small" onClick={handleCopyHmac} aria-label="Sao chép mã HMAC" sx={{ p: 0.25, ml: 0.5 }}>
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, minHeight: 34 }}>
                  Băm SHA-256 kèm Secret Salt, cho phép nối bảng JOIN mà không lộ dữ liệu thật.
                </Typography>
              </Paper>
            </Grid>

            {/* Card 4: DROP */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 1.5,
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      4. LOẠI BỎ (DROP)
                    </Typography>
                    <Chip label="Triệt tiêu" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 600 }} />
                  </Stack>

                  <Box
                    sx={{
                      minHeight: 52,
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        color: 'text.disabled',
                        fontStyle: 'italic',
                        fontSize: '0.75rem',
                      }}
                    >
                      [NULL / CỘT ĐÃ BỊ LOẠI BỎ]
                    </Typography>
                  </Box>
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, minHeight: 34 }}>
                  Cột bị triệt tiêu hoàn toàn, không xuất hiện trong schema và snapshot xuất bản.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}
