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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DatasetIcon from '@mui/icons-material/Dataset';

import {
  useDataSources,
  useCreateScanRun,
  useRun,
  useUpdateFieldDecisions,
  useBuildDataset,
  usePublishDataset,
} from '../hooks/usePiiReview';

type Step = 'select-source' | 'scan-running' | 'review' | 'build' | 'done';

export function DpoReviewExperienceMVP(): JSX.Element {
  const [step, setStep] = useState<Step>('select-source');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const [datasetId, setDatasetId] = useState<number | null>(null);

  // Queries
  const { data: sources, isLoading: sourcesLoading } = useDataSources();
  const { data: currentRun, isLoading: runLoading } = useRun(currentRunId);
  
  // Mutations
  const createScan = useCreateScanRun();
  const updateDecisions = useUpdateFieldDecisions(currentRunId || 0);
  const buildDataset = useBuildDataset(currentRunId || 0);
  const publishDataset = usePublishDataset();

  // Handlers
  const handleSelectSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
  };

  const handleStartScan = async () => {
    if (!selectedSourceId) return;
    
    setStep('scan-running');
    try {
      const run = await createScan.mutateAsync(selectedSourceId);
      setCurrentRunId(run.id);
      
      // Simulate scan completion (in real app, poll for status)
      setTimeout(() => {
        setStep('review');
      }, 2000);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Lỗi khi quét dữ liệu');
      setStep('select-source');
    }
  };

  const handleApprove = async () => {
    if (!currentRunId) return;
    
    try {
      if (!currentRun) return;
      await updateDecisions.mutateAsync(
        currentRun.field_profiles.map((field) => ({
          field_profile_id: field.id,
          action: field.recommended_action,
          reason: `DPO approved recommended action for ${field.field_path}`,
        })),
      );
      setStep('build');
    } catch (error) {
      console.error('Approve failed:', error);
      alert('Lỗi khi duyệt');
    }
  };

  const handleBuild = async () => {
    if (!currentRunId) return;
    
    try {
      const result = await buildDataset.mutateAsync();
      setDatasetId(result.dataset.id);
      setStep('done');
    } catch (error) {
      console.error('Build failed:', error);
      alert('Lỗi khi xây dựng dataset');
    }
  };

  const handlePublish = async () => {
    if (!datasetId) return;
    try {
      await publishDataset.mutateAsync(datasetId);
    } catch (error) {
      console.error('Publish failed:', error);
      alert('Lỗi khi publish dataset');
    }
  };

  // Loading state
  if (sourcesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Step 1: Select Source
  if (step === 'select-source') {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          📊 Chọn Nguồn Dữ Liệu
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Chọn nguồn dữ liệu để quét và phát hiện PII
        </Typography>

        <Grid container spacing={3}>
          {sources?.map((source) => (
            <Grid item xs={12} md={6} key={source.id}>
              <Card
                sx={{
                  border: selectedSourceId === source.id ? 2 : 1,
                  borderColor: selectedSourceId === source.id ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                }}
                onClick={() => handleSelectSource(source.id)}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <DatasetIcon color="primary" />
                      <Typography variant="h6">{source.name}</Typography>
                      <Chip label={source.source_type} size="small" />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      {source.description}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      {source.scope_summary}
                    </Typography>
                    
                    <Chip
                      label={source.status === 'ready' ? 'Sẵn sàng' : source.status}
                      color={source.status === 'ready' ? 'success' : 'default'}
                      size="small"
                      sx={{ width: 'fit-content' }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {selectedSourceId && (
          <Box mt={3}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={() => void handleStartScan()}
              disabled={createScan.isPending}
            >
              Bắt Đầu Quét PII
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  // Step 2: Scanning
  if (step === 'scan-running') {
    return (
      <Box textAlign="center" py={8}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" gutterBottom>
          Đang quét dữ liệu...
        </Typography>
        <Typography color="text.secondary">
          Hệ thống đang phát hiện các trường PII trong nguồn dữ liệu
        </Typography>
      </Box>
    );
  }

  // Step 3: Review
  if (step === 'review' && currentRun) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          📋 Duyệt Kết Quả Quét PII
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Tìm thấy <strong>{currentRun.field_profiles.length} trường</strong> cần xử lý.
          Kiểm tra và duyệt hành động bảo vệ.
        </Alert>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Đường dẫn</strong></TableCell>
                <TableCell><strong>Loại dữ liệu</strong></TableCell>
                <TableCell><strong>Phân loại</strong></TableCell>
                <TableCell><strong>Hành động</strong></TableCell>
                <TableCell><strong>Lý do</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentRun.field_profiles.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {field.source_path}.{field.field_path}
                    </Typography>
                  </TableCell>
                  <TableCell>{field.data_type}</TableCell>
                  <TableCell>
                    <Chip
                      label={field.classification}
                      size="small"
                      color={field.classification.includes('PERSONAL') ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={field.recommended_action}
                      size="small"
                      color={
                        field.recommended_action === 'DROP' ? 'error' :
                        field.recommended_action === 'MASK' ? 'warning' :
                        field.recommended_action === 'HMAC' ? 'info' : 'success'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {field.profile_summary}
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
            color="success"
            size="large"
            startIcon={<CheckCircleIcon />}
            onClick={() => void handleApprove()}
            disabled={updateDecisions.isPending}
          >
            Duyệt & Tiếp Tục
          </Button>
        </Box>
      </Box>
    );
  }

  // Step 4: Build Dataset
  if (step === 'build') {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h5" gutterBottom>
          ✅ Đã Duyệt Thành Công
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Bây giờ bạn có thể xây dựng dataset được bảo vệ
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          onClick={() => void handleBuild()}
          disabled={buildDataset.isPending}
        >
          {buildDataset.isPending ? 'Đang xây dựng...' : 'Xây Dựng Dataset'}
        </Button>
      </Box>
    );
  }

  // Step 5: Done
  if (step === 'done' && datasetId) {
    return (
      <Box textAlign="center" py={8}>
        <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          🎉 Hoàn Thành!
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Dataset ID: {datasetId}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Dataset đã được tạo thành công. Bây giờ bạn có thể publish để Analyst sử dụng.
        </Typography>
        
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="outlined"
            onClick={() => {
              setStep('select-source');
              setSelectedSourceId(null);
              setCurrentRunId(null);
              setDatasetId(null);
            }}
          >
            Quét Nguồn Mới
          </Button>
          <Button
            variant="contained"
            onClick={() => void handlePublish()}
            disabled={publishDataset.isPending}
          >
            {publishDataset.isPending ? 'Đang publish...' : 'Publish Dataset'}
          </Button>
        </Stack>
      </Box>
    );
  }

  if (runLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography>Loading...</Typography>
    </Box>
  );
}
