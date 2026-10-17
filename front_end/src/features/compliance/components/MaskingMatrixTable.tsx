import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { MASKING_DEMO_ITEMS, type MaskingDemoItem } from '../model/maskingDemos';

const LEVEL_COLOR: Record<MaskingDemoItem['piiLevel'], 'info' | 'warning' | 'error'> = {
  L1: 'info',
  L2: 'warning',
  L3: 'error',
};

const mono = { fontFamily: 'monospace', fontSize: '0.8125rem', whiteSpace: 'nowrap' } as const;

export function MaskingMatrixTable(): JSX.Element {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TableChartOutlinedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              Ma trận che dữ liệu theo loại PII
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Cùng một giá trị mẫu (giả lập) sau khi che mờ và băm, kèm cơ chế bảo vệ cho từng loại dữ liệu.
          </Typography>

          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
            <Table size="small" aria-label="Bảng đối chiếu ma trận che mờ" sx={{ minWidth: 880 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '22%' }}>Loại dữ liệu</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: '8%' }}>Cấp độ</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '18%' }}>Giá trị gốc</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: '8%' }}>MASK</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '14%' }}>HMAC</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '30%' }}>Cơ chế bảo vệ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MASKING_DEMO_ITEMS.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.dataTypeName.split('(')[0]?.trim()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {item.description}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={item.piiLevel} size="small" color={LEVEL_COLOR[item.piiLevel]} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ ...mono, whiteSpace: 'normal', color: 'error.dark' }}>{item.rawValue}</TableCell>
                    <TableCell align="center" sx={{ ...mono, color: 'primary.dark', fontWeight: 700 }}>
                      {item.maskValue}
                    </TableCell>
                    <TableCell sx={{ ...mono, fontSize: '0.75rem', color: 'success.dark' }}>
                      <Tooltip title={`HMAC SHA-256: ${item.hmacValue}`}>
                        <span>{item.hmacValue.slice(0, 12)}…</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
                        {item.algorithmNote}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>
    </Card>
  );
}
