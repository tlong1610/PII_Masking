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
import Typography from '@mui/material/Typography';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { MASKING_DEMO_ITEMS } from '../model/maskingDemos';

export function MaskingMatrixTable(): JSX.Element {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TableChartOutlinedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Ma Trận Che Mờ Chuẩn Toàn Diện (Unified Protection Matrix)
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Bảng đối chiếu tổng hợp tất cả các trường dữ liệu tiêu biểu, không cần bấm lọc từng tab:
          </Typography>

          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
            <Table size="small" aria-label="Bảng đối chiếu ma trận che mờ">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '18%' }}>Loại dữ liệu</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '10%' }}>Cấp độ</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '16%' }}>Dữ liệu gốc (RAW)</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '18%' }}>Che mờ (MASK ***)</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '18%' }}>Mã băm nối (HMAC)</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '20%' }}>Cơ chế bảo vệ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MASKING_DEMO_ITEMS.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.dataTypeName.split('(')[0]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.piiLevel}
                        size="small"
                        color={item.piiLevel === 'L3' ? 'error' : item.piiLevel === 'L2' ? 'warning' : 'info'}
                        sx={{ fontWeight: 700, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'error.main' }}>
                      {item.rawValue}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'primary.main', fontWeight: 600 }}>
                      {item.maskValue}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'success.dark', wordBreak: 'break-all' }}>
                      {item.hmacValue.slice(0, 16)}...
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
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
