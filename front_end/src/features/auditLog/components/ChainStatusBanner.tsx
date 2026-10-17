import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useAuditChainStatus } from '../hooks/useAuditLog';

/** Result of re-hashing the whole audit chain on the server — not a static badge. */
export function ChainStatusBanner(): JSX.Element {
  const { data: chain, isLoading, isFetching, isError, refetch } = useAuditChainStatus();

  if (isLoading) return <Skeleton variant="rounded" height={56} />;
  if (isError || !chain) {
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={() => void refetch()} disabled={isFetching}>
            Thử lại
          </Button>
        }
      >
        Không kiểm tra được tính toàn vẹn của nhật ký lúc này.
      </Alert>
    );
  }
  if (!chain.valid) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void refetch()} disabled={isFetching}>
            Kiểm tra lại
          </Button>
        }
      >
        Cảnh báo: nhật ký đã bị sửa hoặc xoá tại hoạt động #{chain.broken_at_id ?? '?'}
        {chain.error ? ` (${chain.error})` : ''}. Các ghi nhận từ đó trở đi không còn đáng tin.
      </Alert>
    );
  }
  return (
    <Alert
      severity="success"
      icon={<VerifiedUserIcon fontSize="inherit" />}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => void refetch()}
          disabled={isFetching}
          startIcon={isFetching ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ fontWeight: 600 }}
        >
          {isFetching ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
        </Button>
      }
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} alignItems={{ sm: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Nhật ký nguyên vẹn
        </Typography>
        <Typography variant="body2">
          {chain.total_events} hoạt động đã ghi, không có dòng nào bị sửa hay xoá.
        </Typography>
      </Stack>
    </Alert>
  );
}
