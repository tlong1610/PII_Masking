import { useState } from 'react';
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

import type { DatasetRelationship } from '../api/realPiiReviewApi';
import { useDatasets, useDatasetPreview } from '../hooks/usePiiReview';

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

export function AnalystDatasetExperienceMVP(): JSX.Element {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: datasets, isLoading } = useDatasets('PUBLISHED');
  const { data: preview, isLoading: previewLoading } = useDatasetPreview(
    showPreview ? selectedDatasetId : null
  );

  const handlePreview = (datasetId: number) => {
    setSelectedDatasetId(datasetId);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedDatasetId(null);
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
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            📊 Preview: {preview.dataset_name}
          </Typography>
          <Button variant="outlined" onClick={handleClosePreview}>
            Đóng Preview
          </Button>
        </Box>

        <Alert severity="success" sx={{ mb: 3 }}>
          Dataset đã được bảo vệ. Tất cả dữ liệu PII đã được che hoặc mã hóa.
        </Alert>

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
                <TableCell><strong>Giá trị sau xử lý</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {preview.columns.map((col) => (
                <TableRow key={col.name}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {col.name}
                    </Typography>
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
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={3}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled
          >
            Download Dataset (Coming Soon)
          </Button>
        </Box>
      </Box>
    );
  }

  // List mode
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        📦 Dataset Đã Publish
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Các dataset đã được DPO duyệt và bảo vệ PII
      </Typography>

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
                    <Chip
                      label={dataset.status.toUpperCase()}
                      color="success"
                      size="small"
                    />
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
                      Xem Preview
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon />}
                      disabled
                    >
                      Download
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
