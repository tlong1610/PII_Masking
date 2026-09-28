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

import { useDatasets, useDatasetPreview } from '../hooks/usePiiReview';

export function AnalystDatasetExperienceMVP(): JSX.Element {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: datasets, isLoading } = useDatasets('published');
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
          <Typography variant="body2" color="text.secondary">
            <strong>Tổng số dòng:</strong> {preview.row_count}
          </Typography>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Tên cột</strong></TableCell>
                <TableCell><strong>Giá trị mẫu (đã che)</strong></TableCell>
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
                      {col.sample_masked_value || '(null)'}
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

