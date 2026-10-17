import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { StatusChip } from '@/shared/ui';
import type { VerifierResult } from '../api/datasetsApi';

export function VerifierResultsTable({ results }: { results: VerifierResult[] }): JSX.Element {
  if (results.length === 0) {
    return <Typography color="text.secondary">Chưa có kết quả kiểm định cho dataset này.</Typography>;
  }
  return (
    <Table size="small" aria-label="Kết quả kiểm định downstream">
      <TableHead>
        <TableRow>
          <TableCell>Kiểm tra</TableCell>
          <TableCell>Kết quả</TableCell>
          <TableCell>Baseline</TableCell>
          <TableCell>Thực tế</TableCell>
          <TableCell>Dung sai</TableCell>
          <TableCell>Chi tiết</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {results.map((result) => (
          <TableRow key={result.id}>
            <TableCell sx={{ fontFamily: 'monospace' }}>{result.check_name}</TableCell>
            <TableCell>
              <StatusChip
                label={result.status === 'PASSED' ? 'Đạt' : 'Không đạt'}
                tone={result.status === 'PASSED' ? 'success' : 'error'}
              />
            </TableCell>
            <TableCell>{result.baseline_value}</TableCell>
            <TableCell>{result.actual_value}</TableCell>
            <TableCell>{result.tolerance}</TableCell>
            <TableCell>{result.details}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
