import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { MascotLoader, StateNotice } from '@/shared/ui';
import { useIssueSqlCredentials, useSqlAccess } from '../hooks/usePiiReview';
import { connectionUrl } from '../model/sqlConnection';

function CopyButton({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <Tooltip title={`Sao chép ${label}`}>
      <IconButton size="small" aria-label={`Sao chép ${label}`} onClick={() => void navigator.clipboard.writeText(value)}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', typography: 'body2', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
          {code}
        </Box>
        <CopyButton value={code} label={label} />
      </Stack>
    </Paper>
  );
}

type SqlAccessPanelProps = { datasetId: number };

/** Read-only SQL login for DBeaver / Power BI / Python, scoped to the Analyst's granted datasets. */
export function SqlAccessPanel({ datasetId }: SqlAccessPanelProps): JSX.Element {
  const { data: access, isLoading, isError } = useSqlAccess();
  const issue = useIssueSqlCredentials();
  const [password, setPassword] = useState<string | null>(null);

  if (isLoading) return <MascotLoader compact title="Đang tải thông tin kết nối…" />;
  if (isError || !access) {
    return <StateNotice kind="error" title="Không tải được thông tin kết nối SQL" description="Vui lòng thử lại sau." />;
  }

  const dataset = access.datasets.find((item) => item.dataset_id === datasetId);
  const firstTable = dataset?.tables[0];
  const hasLogin = access.has_credentials || password !== null;

  const requestPassword = async (): Promise<void> => {
    const issued = await issue.mutateAsync();
    setPassword(issued.password ?? null);
  };

  const rows: Array<[string, string]> = [
    ['Host', access.host],
    ['Port', String(access.port)],
    ['Database', access.database],
    ['User', access.username],
    ['SSL', access.sslmode],
  ];

  return (
    <Stack spacing={2.5}>
      <Alert severity="info" sx={{ borderRadius: '6px' }}>
        Kết nối thẳng bằng DBeaver, Power BI, Metabase hoặc Python. Tài khoản này <strong>chỉ đọc</strong> và chỉ thấy các
        dataset đã được cấp cho bạn, đều là dữ liệu đã bảo vệ. DPO thu hồi quyền thì tài khoản mất quyền ngay.
      </Alert>

      {!dataset && (
        <Alert severity="warning" sx={{ borderRadius: '6px' }}>
          Dataset này chưa có trong kết nối SQL (ví dụ dữ liệu lưu ở MongoDB). Bạn vẫn xem và tải được ở các tab khác.
        </Alert>
      )}

      <Paper variant="outlined">
        <Table size="small" aria-label="Thông tin kết nối SQL">
          <TableBody>
            {rows.map(([label, value]) => (
              <TableRow key={label}>
                <TableCell sx={{ width: 140, fontWeight: 600 }}>{label}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{value}</TableCell>
                <TableCell align="right" sx={{ width: 56 }}>
                  <CopyButton value={value} label={label} />
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Mật khẩu</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>
                {password ?? (hasLogin ? '•••••••• (đã tạo, chỉ hiện một lần)' : 'Chưa tạo')}
              </TableCell>
              <TableCell align="right">{password && <CopyButton value={password} label="mật khẩu" />}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {password && (
        <Alert severity="warning" sx={{ borderRadius: '6px' }}>
          Lưu mật khẩu ngay: nó chỉ hiện một lần. Quên thì bấm “Đặt lại mật khẩu” để tạo mật khẩu mới.
        </Alert>
      )}
      {issue.isError && <Alert severity="error">Không tạo được thông tin kết nối. Vui lòng thử lại.</Alert>}

      <Box>
        <Button variant={hasLogin ? 'outlined' : 'contained'} onClick={() => void requestPassword()} disabled={issue.isPending}>
          {issue.isPending ? 'Đang tạo…' : hasLogin ? 'Đặt lại mật khẩu' : 'Tạo thông tin kết nối'}
        </Button>
      </Box>

      {hasLogin && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Chuỗi kết nối
          </Typography>
          <CodeBlock code={connectionUrl(access, password)} label="chuỗi kết nối" />
        </Stack>
      )}

      {dataset && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Dataset này trong SQL: schema <Box component="code">{dataset.schema_name}</Box>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bảng: {dataset.tables.join(', ')}. Tên schema giữ nguyên khi DPO lưu lại dataset.
          </Typography>
          {firstTable && (
            <CodeBlock code={`SELECT *\nFROM ${dataset.schema_name}.${firstTable}\nLIMIT 100;`} label="câu truy vấn" />
          )}
        </Stack>
      )}
    </Stack>
  );
}
