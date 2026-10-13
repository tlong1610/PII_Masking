import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useAuditChainStatus } from '../hooks/useAuditLog';
import { shortenHash } from '../model/auditLabels';

/** Result of re-hashing the whole audit chain on the server — not a static badge. */
export function ChainStatusBanner(): JSX.Element {
  const { data: chain, isLoading, isError } = useAuditChainStatus();

  if (isLoading) return <Skeleton variant="rounded" height={48} />;
  if (isError || !chain) {
    return <Alert severity="warning">Không kiểm tra được chuỗi hash của nhật ký kiểm toán.</Alert>;
  }
  if (!chain.valid) {
    return (
      <Alert severity="error">
        Chuỗi hash bị phá vỡ tại sự kiện #{chain.broken_at_id ?? '?'}
        {chain.error ? ` — ${chain.error}` : ''}. Nhật ký có thể đã bị chỉnh sửa.
      </Alert>
    );
  }
  return (
    <Alert severity="success">
      Chuỗi hash toàn vẹn: {chain.total_events} sự kiện
      {chain.head_hash ? ` · head ${shortenHash(chain.head_hash)}` : ''}
    </Alert>
  );
}
