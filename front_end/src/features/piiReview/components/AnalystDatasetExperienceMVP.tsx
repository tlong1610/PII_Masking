import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DatasetIcon from '@mui/icons-material/Dataset';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  previewDataset,
  type DatasetPreview,
  type DatasetRelationship,
} from '../api/realPiiReviewApi';
import { useDatasets, useDatasetPreview } from '../hooks/usePiiReview';
import { CollapsibleTableGroup } from './CollapsibleTableGroup';
import {
  DatasetStatusChip,
  TransformChip,
} from './PolicyChips';
import {
  TRANSFORMS,
  type TransformKind,
  getTransformColor,
  getTransformLabel,
} from '../model/policyLabels';

function RelationshipDiagram({ relationships }: { relationships: DatasetRelationship[] }): JSX.Element {
  const tables = Array.from(
    new Set(
      relationships.flatMap((relation) => [relation.source_table, relation.target_table]),
    ),
  );
  const tableId = (table: string) => `table-${table.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const nodes: Node[] = tables.map((table, index) => ({
    id: tableId(table),
    position: {
      x: (index % 3) * 270,
      y: Math.floor(index / 3) * 110,
    },
    data: { label: table },
    style: {
      border: '1px solid #1976d2',
      borderRadius: 10,
      background: '#eef6ff',
      color: '#123b63',
      fontWeight: 700,
      padding: '12px 18px',
      minWidth: 180,
      textAlign: 'center',
    },
  }));
  const edges: Edge[] = relationships.map((relation, index) => ({
    id: `relation-${index}`,
    source: tableId(relation.source_table),
    target: tableId(relation.target_table),
    label: `${relation.source_column} → ${relation.target_column}`,
    animated: false,
    style: { stroke: '#1976d2', strokeWidth: 1.5 },
    labelStyle: { fill: '#315a7d', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
  }));

  return (
    <Box sx={{ height: 560, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.2 }}>
        <MiniMap nodeColor="#1976d2" pannable zoomable />
        <Controls />
        <Background gap={20} size={1} color="#d7e3ef" />
      </ReactFlow>
    </Box>
  );
}

function formatPreviewValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '(không hiển thị)';
  }
  return String(value);
}

function getDatasetFileName(datasetName: string): string {
  const safeName = datasetName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safeName || 'protected-dataset'}.csv`;
}

function formatCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildProtectedCsv(preview: DatasetPreview): string {
  const exportColumns = preview.columns.filter((column) => column.transform !== 'DROPPED');
  const header = exportColumns.map((column) => formatCsvCell(column.name)).join(',');
  const rows = preview.rows.map((row) =>
    exportColumns.map((column) => formatCsvCell(row[column.name])).join(','),
  );
  return [header, ...rows].join('\n');
}

function downloadCsv(preview: DatasetPreview): void {
  const csv = buildProtectedCsv(preview);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getDatasetFileName(preview.dataset_name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AnalystDatasetExperienceMVP(): JSX.Element {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [collapsedPreviewSources, setCollapsedPreviewSources] = useState<Record<string, boolean>>(
    {},
  );
  const [downloadingDatasetId, setDownloadingDatasetId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: datasets, isLoading } = useDatasets('PUBLISHED');
  const { data: preview, isLoading: previewLoading } = useDatasetPreview(
    showPreview ? selectedDatasetId : null
  );

  const previewColumnGroups = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof preview>['columns']>();
    preview?.columns.forEach((column) => {
      const sourcePath = column.source_path || 'unknown';
      const current = grouped.get(sourcePath) ?? [];
      grouped.set(sourcePath, [...current, column]);
    });
    return Array.from(grouped.entries()).map(([sourcePath, columns]) => ({
      sourcePath,
      columns,
      droppedCount: columns.filter((column) => column.transform === 'DROPPED').length,
    }));
  }, [preview]);

  const handlePreview = (datasetId: number) => {
    setSelectedDatasetId(datasetId);
    setShowPreview(true);
    setCollapsedPreviewSources({});
    setDownloadError(null);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedDatasetId(null);
    setCollapsedPreviewSources({});
    setDownloadError(null);
  };

  const handleTogglePreviewSource = (sourcePath: string) => {
    setCollapsedPreviewSources((current) => ({
      ...current,
      [sourcePath]: !current[sourcePath],
    }));
  };

  const handleDownloadPreview = (datasetPreview: DatasetPreview) => {
    setDownloadError(null);
    downloadCsv(datasetPreview);
  };

  const handleDownloadDataset = async (datasetId: number) => {
    try {
      setDownloadError(null);
      setDownloadingDatasetId(datasetId);
      const datasetPreview = await previewDataset(datasetId);
      downloadCsv(datasetPreview);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError('Không thể tải dataset. Vui lòng mở xem trước rồi thử lại.');
    } finally {
      setDownloadingDatasetId(null);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <DatasetIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Chưa có dataset nào được publish
        </Typography>
        <Typography color="text.secondary">
          DPO sẽ publish dataset sau khi hoàn tất quy trình bảo vệ dữ liệu
        </Typography>
      </Box>
    );
  }

  // Preview mode
  if (showPreview && previewLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (showPreview && preview) {
    const transformCounts = preview.columns.reduce<Record<TransformKind, number>>(
      (counts, column) => ({ ...counts, [column.transform]: counts[column.transform] + 1 }),
      { MASK: 0, HMAC: 0, KEEP: 0, DROPPED: 0 },
    );

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            Xem trước: {preview.dataset_name}
          </Typography>
          <Button variant="outlined" onClick={handleClosePreview}>
            Đóng xem trước
          </Button>
        </Box>

        <Alert severity="success" sx={{ mb: 3 }}>
          Dataset đã được bảo vệ. Dữ liệu PII đã được che, băm HMAC hoặc loại bỏ trước khi Analyst xem.
        </Alert>

        {downloadError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {downloadError}
          </Alert>
        )}

        <Paper sx={{ mb: 3, p: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <DatasetStatusChip status={preview.status} />
            {TRANSFORMS.map((transform) => (
              <Chip
                key={transform}
                label={`${getTransformLabel(transform)}: ${transformCounts[transform]}`}
                color={getTransformColor(transform)}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            🔗 Sơ đồ quan hệ dữ liệu
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Quan hệ được đọc từ khóa ngoại của schema PostgreSQL; sơ đồ chỉ hiển thị metadata.
          </Typography>
          {preview.relationships.length === 0 ? (
            <Typography color="text.secondary">
              Nguồn chưa cung cấp metadata khóa ngoại.
            </Typography>
          ) : (
            <RelationshipDiagram relationships={preview.relationships} />
          )}
        </Paper>

        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Dòng minh họa an toàn:</strong> {preview.rows.length}
          </Typography>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Tên cột</strong></TableCell>
                <TableCell><strong>Cách xử lý</strong></TableCell>
                <TableCell><strong>Giá trị sau xử lý</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewColumnGroups.map((group) => (
                <CollapsibleTableGroup
                  key={group.sourcePath}
                  collapsed={Boolean(collapsedPreviewSources[group.sourcePath])}
                  colSpan={3}
                  countLabel={`${group.columns.length} cột`}
                  onToggle={() => handleTogglePreviewSource(group.sourcePath)}
                  sourcePath={group.sourcePath}
                  summary={
                    group.droppedCount > 0 ? (
                      <Chip
                        label={`${group.droppedCount} đã loại bỏ`}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    ) : undefined
                  }
                  tone="primary"
                >
                  {group.columns.map((col) => (
                    <TableRow key={`${group.sourcePath}.${col.name}`}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {col.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TransformChip transform={col.transform} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {col.transform === 'DROPPED'
                            ? 'Đã loại bỏ'
                            : formatPreviewValue(preview.rows[0]?.[col.name])}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </CollapsibleTableGroup>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={3}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadPreview(preview)}
            disabled={preview.columns.every((column) => column.transform === 'DROPPED')}
          >
            Tải CSV an toàn
          </Button>
        </Box>
      </Box>
    );
  }

  // List mode
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dataset đã phát hành
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Các dataset đã được DPO duyệt và bảo vệ PII
      </Typography>

      {downloadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {downloadError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {datasets.map((dataset) => (
          <Grid item xs={12} md={6} key={dataset.id}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DatasetIcon color="primary" />
                    <Typography variant="h6">{dataset.dataset_name}</Typography>
                  </Box>

                  <Box>
                    <DatasetStatusChip status={dataset.status} />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Dataset ID: {dataset.id} | Run ID: {dataset.run_id}
                  </Typography>

                  {dataset.output_location && (
                    <Typography variant="caption" color="text.secondary">
                      Vị trí: {dataset.output_location}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handlePreview(dataset.id)}
                    >
                      Xem trước
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => void handleDownloadDataset(dataset.id)}
                      disabled={downloadingDatasetId === dataset.id}
                    >
                      {downloadingDatasetId === dataset.id ? 'Đang tải...' : 'Tải CSV'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
