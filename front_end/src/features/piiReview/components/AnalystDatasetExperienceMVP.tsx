import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import DownloadIcon from '@mui/icons-material/Download';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import CodeIcon from '@mui/icons-material/Code';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import PinIcon from '@mui/icons-material/Pin';

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
import { ErdLineageDiagram } from './ErdLineageDiagram';
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
  const [activeTab, setActiveTab] = useState<number>(0);
  const [datasetSearch, setDatasetSearch] = useState<string>('');
  const [collapsedPreviewSources, setCollapsedPreviewSources] = useState<Record<string, boolean>>({});
  const [isQueryRunning, setIsQueryRunning] = useState<boolean>(false);
  const [queryRunTime, setQueryRunTime] = useState<number | null>(null);
  const [downloadingDatasetId, setDownloadingDatasetId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: datasets, isLoading } = useDatasets('PUBLISHED');

  // Auto-select first dataset
  useMemo(() => {
    if (!selectedDatasetId && datasets && datasets.length > 0 && datasets[0]) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [selectedDatasetId, datasets]);

  const activeDataset = useMemo(
    () => datasets?.find((d) => d.id === selectedDatasetId) ?? null,
    [datasets, selectedDatasetId],
  );

  const { data: preview, isLoading: previewLoading } = useDatasetPreview(selectedDatasetId);

  const filteredDatasets = useMemo(() => {
    if (!datasets) return [];
    if (!datasetSearch.trim()) return datasets;
    return datasets.filter((d) =>
      d.dataset_name.toLowerCase().includes(datasetSearch.toLowerCase()),
    );
  }, [datasets, datasetSearch]);

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

  const transformCounts = useMemo(() => {
    if (!preview) return { MASK: 0, HMAC: 0, KEEP: 0, DROPPED: 0 };
    return preview.columns.reduce<Record<TransformKind, number>>(
      (counts, column) => ({ ...counts, [column.transform]: counts[column.transform] + 1 }),
      { MASK: 0, HMAC: 0, KEEP: 0, DROPPED: 0 },
    );
  }, [preview]);

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

  const handleRunSampleQuery = () => {
    setIsQueryRunning(true);
    setQueryRunTime(null);
    setTimeout(() => {
      setIsQueryRunning(false);
      setQueryRunTime(0.42);
    }, 600);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={36} sx={{ color: '#1B51A4' }} />
      </Box>
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <Box textAlign="center" py={8} maxWidth={480} mx="auto">
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            color: '#6B7280',
          }}
        >
          <StorageOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
          Chưa có dataset nào được phát hành
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280', lineHeight: 1.6 }}>
          DPO sẽ phát hành (PUBLISH) các bộ dữ liệu sau khi hoàn tất quy trình quét PII và áp dụng quy tắc sàn bảo mật
          Minimum Masking Floor.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', minHeight: 'calc(100vh - 100px)' }}>
      {/* ========================================================================= */}
      {/* DATABRICKS PUBLISHED CATALOG SIDEBAR (260px)                              */}
      {/* ========================================================================= */}
      <Box
        component="aside"
        sx={{
          width: 270,
          flexShrink: 0,
          bgcolor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          overflow: 'hidden',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          height: 'calc(100vh - 90px)',
          position: 'sticky',
          top: 70,
        }}
      >
        {/* Header */}
        <Box sx={{ p: 1.5, borderBottom: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
            Published Metastore
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 1,
              px: 1,
              py: 0.4,
              borderRadius: '4px',
              bgcolor: '#EFF6FF',
              border: '1px solid #BFDBFE',
            }}
          >
            <VerifiedUserIcon sx={{ fontSize: 13, color: '#1D4ED8' }} />
            <Typography variant="caption" sx={{ color: '#1E40AF', fontWeight: 600, fontSize: '0.7rem' }}>
              Zero Raw-PII Verified
            </Typography>
          </Box>
        </Box>

        {/* Search */}
        <Box sx={{ p: 1, borderBottom: '1px solid #E5E7EB' }}>
          <TextField
            size="small"
            placeholder="Type to search datasets..."
            value={datasetSearch}
            onChange={(e) => setDatasetSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: '#9CA3AF' }} />
                </InputAdornment>
              ),
              sx: { fontSize: '0.78rem', height: 32 },
            }}
          />
        </Box>

        {downloadError && (
          <Alert severity="error" sx={{ m: 1, fontSize: '0.75rem' }}>
            {downloadError}
          </Alert>
        )}

        {/* List of Published Datasets */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
          <Stack spacing={0.5}>
            {filteredDatasets.map((dataset) => {
              const isSelected = selectedDatasetId === dataset.id;
              return (
                <Box
                  key={dataset.id}
                  onClick={() => setSelectedDatasetId(dataset.id)}
                  sx={{
                    p: 1.25,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    bgcolor: isSelected ? '#EBF3FB' : 'transparent',
                    borderLeft: isSelected ? '3px solid #1B51A4' : '3px solid transparent',
                    border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: isSelected ? '#EBF3FB' : '#F3F4F6',
                    },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TableChartOutlinedIcon
                      sx={{ fontSize: 18, color: isSelected ? '#1B51A4' : '#6B7280', flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#1B51A4' : '#111827',
                          fontSize: '0.8125rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {dataset.dataset_name}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                        <Chip
                          label="PUBLISHED"
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            bgcolor: '#ECFDF5',
                            color: '#065F46',
                            border: '1px solid #A7F3D0',
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.68rem' }}>
                          ID: {dataset.id}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>

      {/* ========================================================================= */}
      {/* MAIN DATASET DETAIL & NOTEBOOK RUNNER WORKSPACE                           */}
      {/* ========================================================================= */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Paper
          variant="outlined"
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Header Row */}
          <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: '1px solid #E5E7EB' }}>
            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem', mb: 1, display: 'block' }}>
              Catalog Explorer &gt; Published Metastore &gt;{' '}
              <strong style={{ color: '#111827' }}>{activeDataset?.dataset_name || 'dataset'}</strong>
            </Typography>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={2}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '6px',
                    bgcolor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#065F46',
                  }}
                >
                  <TableChartOutlinedIcon />
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>
                      {activeDataset?.dataset_name}
                    </Typography>
                    <IconButton size="small" sx={{ color: '#9CA3AF' }} aria-label="Sao chép tên dataset">
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#9CA3AF' }} aria-label="Yêu thích">
                      <StarBorderIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Chip
                      label="PUBLISHED • MASKED"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        bgcolor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      Output: {activeDataset?.output_location || 'local_vault_storage'}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>

              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                disabled
                sx={{ borderColor: '#D1D5DB', color: '#6B7280' }}
              >
                Xuất file CSV an toàn
              </Button>
            </Stack>
          </Box>

          {/* Databricks Tab Bar */}
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{ px: 3, bgcolor: '#FFFFFF', minHeight: 44 }}
          >
            <Tab label="Sample Data (Masked)" />
            <Tab label="Schema & Transforms" />
            <Tab label="Lineage & Relationships" />
            <Tab label="Query Notebook (SQL / Genie)" />
          </Tabs>

          {/* TAB 0: SAMPLE DATA */}
          {activeTab === 0 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {previewLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={30} sx={{ color: '#1B51A4' }} />
                </Box>
              ) : preview ? (
                <Stack spacing={2.5}>
                  <Alert severity="success" sx={{ borderRadius: '6px' }}>
                    Dataset đã được bảo vệ toàn diện theo Nghị định 13. Dữ liệu nhạy cảm đã bị che giấu hoặc băm HMAC
                    trước khi hiển thị.
                  </Alert>

                  {/* Summary transform chips */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <DatasetStatusChip status={preview.status} />
                    {TRANSFORMS.map((transform) => (
                      <Chip
                        key={transform}
                        label={`${getTransformLabel(transform)}: ${transformCounts[transform]}`}
                        color={getTransformColor(transform)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.72rem', borderRadius: '4px' }}
                      />
                    ))}
                  </Stack>

                  {/* Databricks Sample Table Grid */}
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ borderRadius: '6px', border: '1px solid #E5E7EB' }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 40, color: '#9CA3AF' }}>#</TableCell>
                          {preview.columns
                            .filter((c) => c.transform !== 'DROPPED')
                            .slice(0, 6)
                            .map((col) => (
                              <TableCell key={col.name}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <TextFieldsIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                                  <span>{col.name}</span>
                                </Stack>
                              </TableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.rows.slice(0, 8).map((row, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ color: '#9CA3AF', fontFamily: 'monospace' }}>{idx + 1}</TableCell>
                            {preview.columns
                              .filter((c) => c.transform !== 'DROPPED')
                              .slice(0, 6)
                              .map((col) => (
                                <TableCell key={col.name} sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                  {formatPreviewValue(row[col.name])}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              ) : null}
            </Box>
          )}

          {/* TAB 1: SCHEMA & TRANSFORMS */}
          {activeTab === 1 && preview && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: '6px', border: '1px solid #E5E7EB' }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên cột</TableCell>
                      <TableCell>Phương thức biến đổi</TableCell>
                      <TableCell>Dữ liệu mẫu sau xử lý</TableCell>
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
                              sx={{ height: 20, fontSize: '0.68rem', borderRadius: '4px' }}
                            />
                          ) : undefined
                        }
                      >
                        {group.columns.map((col) => (
                          <TableRow key={`${group.sourcePath}.${col.name}`} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {col.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <TransformChip transform={col.transform} />
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'monospace',
                                  color: col.transform === 'DROPPED' ? 'error.main' : 'text.secondary',
                                }}
                              >
                                {col.transform === 'DROPPED'
                                  ? '[ĐÃ LOẠI BỎ]'
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
            </Box>
          )}

          {/* TAB 2: LINEAGE & RELATIONSHIPS */}
          {activeTab === 2 && preview && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Sơ đồ quan hệ thực thể (ERD Data Lineage)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Trực quan hóa cấu trúc bảng, kiểu dữ liệu, khóa chính (PK), khóa ngoại (FK) và liên kết khóa băm HMAC an toàn theo Nghị định 13.
                </Typography>
              </Box>
              <ErdLineageDiagram preview={preview} />
            </Box>
          )}

          {/* TAB 3: QUERY NOTEBOOK (DATABRICKS STYLE - Databricks web Aug 2025 200.png) */}
          {activeTab === 3 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2.5}>
                {/* Notebook Action Bar */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderRadius: '6px',
                    bgcolor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CodeIcon sx={{ color: '#1B51A4', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Interactive Query Notebook (Python / SQL)
                    </Typography>
                    <Chip
                      label="Connected: piiguard-vault-secure"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        bgcolor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>

                  <Button
                    variant="contained"
                    size="small"
                    startIcon={
                      isQueryRunning ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon sx={{ fontSize: 16 }} />
                    }
                    onClick={handleRunSampleQuery}
                    disabled={isQueryRunning}
                    sx={{ bgcolor: '#1B51A4', '&:hover': { bgcolor: '#154185' } }}
                  >
                    {isQueryRunning ? 'Đang chạy truy vấn...' : 'Run Query'}
                  </Button>
                </Box>

                {/* SQL Editor Cell (Databricks style) */}
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: '6px',
                    border: '1px solid #BFDBFE',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ bgcolor: '#F8FAFC', p: 1, borderBottom: '1px solid #E5E7EB' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B51A4' }}>
                      SQL Cell 1 — Aggregated Analytics
                    </Typography>
                  </Box>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      bgcolor: '#FFFFFF',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      color: '#1E293B',
                      lineHeight: 1.6,
                      overflowX: 'auto',
                    }}
                  >
                    {`-- Truy vấn dữ liệu phân tích khách hàng đã khử định danh
SELECT 
    CASE 
        WHEN age BETWEEN 18 AND 30 THEN '18-30'
        WHEN age BETWEEN 31 AND 50 THEN '31-50'
        ELSE '51+' 
    END AS age_bracket,
    COUNT(*) AS total_customers,
    ROUND(AVG(transaction_amount), 2) AS avg_spending
FROM ${activeDataset?.dataset_name || 'customer_analytics_published'}
GROUP BY age_bracket
ORDER BY total_customers DESC;`}
                  </Box>
                </Card>

                {/* Execution Result Grid */}
                {queryRunTime !== null && (
                  <Card variant="outlined" sx={{ borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#111827' }}>
                          Kết quả truy vấn (3 rows | {queryRunTime}s runtime)
                        </Typography>
                        <Chip
                          label="0 Raw PII Leak"
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#ECFDF5', color: '#16A34A', fontWeight: 700 }}
                        />
                      </Stack>
                    </Box>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 40, color: '#9CA3AF' }}>#</TableCell>
                            <TableCell>Nhóm độ tuổi (age_bracket)</TableCell>
                            <TableCell>Tổng số khách hàng (total_customers)</TableCell>
                            <TableCell>Chi tiêu trung bình (avg_spending)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {[
                            { id: 1, bracket: '31-50', count: 1420, avg: '1,850,000 VND' },
                            { id: 2, bracket: '18-30', count: 980, avg: '1,240,000 VND' },
                            { id: 3, bracket: '51+', count: 560, avg: '2,120,000 VND' },
                          ].map((r) => (
                            <TableRow key={r.id} hover>
                              <TableCell sx={{ color: '#9CA3AF', fontFamily: 'monospace' }}>{r.id}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{r.bracket}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{r.count.toLocaleString()}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', color: '#1B51A4' }}>{r.avg}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                )}
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
