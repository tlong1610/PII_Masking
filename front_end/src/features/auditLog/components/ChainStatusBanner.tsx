import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useAuditChainStatus } from '../hooks/useAuditLog';
import { shortenHash } from '../model/auditLabels';

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
        Không kết nối được dịch vụ kiểm chứng chuỗi hash của sổ cái kiểm toán.
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
        CẢNH BÁO: Chuỗi hash bị phá vỡ tại khối #{chain.broken_at_id ?? '?'}
        {chain.error ? ` — ${chain.error}` : ''}. Dữ liệu kiểm toán có thể đã bị can thiệp!
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
          {isFetching ? 'Đang kiểm chứng...' : 'Kiểm chứng toàn vẹn'}
        </Button>
      }
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} alignItems={{ sm: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Sổ cái chuỗi băm toàn vẹn 100%
        </Typography>
        <Typography variant="caption">
          {chain.total_events} khối liên tục · Head: <strong>{chain.head_hash ? shortenHash(chain.head_hash) : 'genesis'}</strong> · Không phát hiện can thiệp
        </Typography>
      </Stack>
    </Alert>
  );
}
