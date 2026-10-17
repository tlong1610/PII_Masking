import { useState } from 'react';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useDatasetPreview } from '../hooks/useDatasets';
import { TransformChip } from './TransformChip';

type DatasetPreviewTableProps = {
  datasetId: number;
  /** Preview only exists for VERIFIED/PUBLISHED snapshots; the backend refuses the rest. */
  available: boolean;
};

/** Rows read back from the protected snapshot — values are already MASK/HMAC'd, never raw. */
export function DatasetPreviewTable({ datasetId, available }: DatasetPreviewTableProps): JSX.Element {
  const [table, setTable] = useState<string | null>(null);
  const { data: preview, isLoading, error } = useDatasetPreview(datasetId, table, available);

  if (!available) {
    return <Alert severity="info">Snapshot đã bị thu hồi hoặc chưa sẵn sàng nên không có dữ liệu xem trước.</Alert>;
  }
  if (error) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Không tải được dữ liệu xem trước.'}</Alert>;
  }
  if (isLoading || !preview) {
    return <LinearProgress aria-label="Đang tải dữ liệu xem trước" />;
  }

  const columns = preview.columns.filter(
    (column) => column.source_path === preview.selected_table && column.transform !== 'DROPPED',
  );
  const droppedCount = preview.columns.filter(
    (column) => column.source_path === preview.selected_table && column.transform === 'DROPPED',
  ).length;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        {preview.tables.length > 1 ? (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id={`preview-table-${datasetId}`}>Bảng / collection</InputLabel>
            <Select
              labelId={`preview-table-${datasetId}`}
              label="Bảng / collection"
              value={preview.selected_table}
              onChange={(event) => setTable(event.target.value)}
            >
              {preview.tables.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography fontWeight={600}>{preview.selected_table}</Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {preview.rows.length} dòng · {columns.length} cột hiển thị
          {droppedCount > 0 ? ` · ${droppedCount} cột đã loại bỏ` : ''}
        </Typography>
      </Stack>
      {preview.note ? <Alert severity="success">{preview.note}</Alert> : null}
      <TableContainer sx={{ maxHeight: 420 }}>
        <Table size="small" stickyHeader aria-label="Dữ liệu đã bảo vệ">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.name}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
                    <span>{column.name}</span>
                    <TransformChip transform={column.transform} />
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {preview.rows.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.name} sx={{ fontFamily: 'monospace' }}>
                    {String(row[column.name] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
