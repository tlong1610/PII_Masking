import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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

  const masked = maskString(inputValue);
  const hmac = simulateHmacSha256(inputValue);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
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

          <TextField
            fullWidth
            size="small"
            label="Dữ liệu thử nghiệm (Input Value)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nhập họ tên, số điện thoại, email, cccd..."
            inputProps={{ 'aria-label': 'Dữ liệu thử nghiệm' }}
          />

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
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
              />
            ))}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'error.main' }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>
                      1. GỐC (RAW)
                    </Typography>
                    <Chip label="Cấm lưu thô" color="error" size="small" sx={{ height: 20, fontSize: '0.625rem' }} />
                  </Stack>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 600 }}>
                    {inputValue || '(Trống)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Chứa toàn bộ danh tính gốc, vi phạm sàn bảo mật nếu xuất bản ra Analyst.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'primary.main', bgcolor: 'primary.50' }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      2. CHE MỜ (MASK ***)
                    </Typography>
                    <Chip label="Chuẩn MASK ***" color="primary" size="small" sx={{ height: 20, fontSize: '0.625rem' }} />
                  </Stack>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 700, color: 'primary.dark' }}>
                    {masked}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thay thế bằng ký tự đại diện (***), giấu hoàn toàn dữ liệu theo chuẩn MASK_PLACEHOLDER.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'success.main' }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>
                      3. BĂM MẬT MÃ (HMAC)
                    </Typography>
                    <Chip label="Joinable (Khóa nối)" color="success" size="small" sx={{ height: 20, fontSize: '0.625rem' }} />
                  </Stack>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: 'success.dark', fontWeight: 600 }}>
                    {hmac}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Băm SHA-256 kèm Secret Salt, cho phép nối bảng JOIN mà không lộ dữ liệu thật.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'grey.400' }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      4. LOẠI BỎ (DROP)
                    </Typography>
                    <Chip label="Triệt tiêu" size="small" sx={{ height: 20, fontSize: '0.625rem' }} />
                  </Stack>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.disabled', fontStyle: 'italic' }}>
                    [NULL / CỘT ĐÃ BỊ LOẠI BỎ]
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cột bị triệt tiêu hoàn toàn, không xuất hiện trong schema và snapshot xuất bản.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}
