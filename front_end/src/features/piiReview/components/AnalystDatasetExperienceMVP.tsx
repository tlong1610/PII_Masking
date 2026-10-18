import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
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
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TextFieldsIcon from '@mui/icons-material/TextFields';

import '@xyflow/react/dist/style.css';

import { STICKY_PANEL_HEIGHT, STICKY_PANEL_TOP } from '@/shared/config/layout';
import { MascotLoader, StateNotice } from '@/shared/ui';
import { exportDataset, type DatasetPreview } from '../api/realPiiReviewApi';
import { ErdLineageDiagram } from './ErdLineageDiagram';
import { useDatasets, useDatasetPreview } from '../hooks/usePiiReview';
import { CollapsibleTableGroup } from './CollapsibleTableGroup';
import { DatasetStatusBadge, TransformChip } from '@/features/datasets';
import { getTransformAnalystHint } from '../model/policyLabels';
import { buildJoinSnippets } from '../model/joinSnippets';

const ROW_LIMIT_OPTIONS = [20, 50, 100, 200] as const;

function formatPreviewValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '(không hiển thị)';
  }
  return String(value);
}

function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Copyable JOIN examples built from the dataset's real relationships (never executed here). */
function JoinExamples({ preview }: { preview: DatasetPreview }): JSX.Element {
  const snippets = buildJoinSnippets(preview.relationships, preview.columns);
  return (
    <Stack spacing={1.5} sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Cách nối các bảng trong dataset
      </Typography>
      {snippets.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Dataset này không có cặp khóa nối nào được giữ lại (KEEP hoặc HMAC ở cả hai đầu).
        </Typography>
      ) : (
        snippets.map((snippet) => (
          <Paper key={snippet.key} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Typography variant="caption" color="text.secondary">
                {snippet.description}
              </Typography>
              <Tooltip title="Sao chép SQL">
                <IconButton
                  size="small"
                  aria-label="Sao chép SQL"
                  onClick={() => void navigator.clipboard.writeText(snippet.sql)}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Box component="pre" sx={{ m: 0, mt: 1, fontFamily: 'monospace', typography: 'body2', overflowX: 'auto' }}>
              {snippet.sql}
            </Box>
          </Paper>
        ))
      )}
    </Stack>
  );
}

export function AnalystDatasetExperienceMVP(): JSX.Element {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [datasetSearch, setDatasetSearch] = useState<string>('');
  const [collapsedPreviewSources, setCollapsedPreviewSources] = useState<Record<string, boolean>>({});
  const [downloadingTarget, setDownloadingTarget] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<number>(ROW_LIMIT_OPTIONS[0]);

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

  const { data: preview, isLoading: previewLoading } = useDatasetPreview(
    selectedDatasetId,
    selectedTable,
    rowLimit,
  );

  const sampleColumns = useMemo(
    () =>
      preview?.columns.filter(
        (column) => column.source_path === preview.selected_table && column.transform !== 'DROPPED',
      ) ?? [],
    [preview],
  );

  const droppedInTable = useMemo(
    () =>
      preview?.columns.filter(
        (column) => column.source_path === preview.selected_table && column.transform === 'DROPPED',
      ) ?? [],
    [preview],
  );

  const handleSelectDataset = (datasetId: number) => {
    setSelectedDatasetId(datasetId);
    setSelectedTable(null);
  };

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

  const handleTogglePreviewSource = (sourcePath: string) => {
    setCollapsedPreviewSources((current) => ({
      ...current,
      [sourcePath]: !current[sourcePath],
    }));
  };

  /** table=null downloads every table of the dataset (ZIP, one CSV each); otherwise one table's CSV. */
  const handleDownloadDataset = async (datasetId: number, table: string | null) => {
    try {
      setDownloadError(null);
      setDownloadingTarget(table ?? 'all');
      const { blob, filename } = await exportDataset(datasetId, table);
      saveFile(blob, filename ?? `dataset-${datasetId}${table ? `-${table}.csv` : '.zip'}`);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError('Không thể tải dataset. Vui lòng thử lại hoặc liên hệ DPO.');
    } finally {
      setDownloadingTarget(null);
    }
  };

  if (isLoading) {
    return (
      <MascotLoader title="Đang tải các dataset đã phát hành…" />
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <StateNotice
        kind="empty"
        pose="awaiting"
        title="Chưa có dataset nào được phát hành"
        description="DPO sẽ phát hành các bộ dữ liệu sau khi hoàn tất quét PII và áp dụng mức che tối thiểu."
      />
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
          height: STICKY_PANEL_HEIGHT,
          position: 'sticky',
          top: STICKY_PANEL_TOP,
        }}
      >
        {/* Header */}
        <Box sx={{ p: 1.5, borderBottom: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
            Dataset đã phát hành
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ p: 1, borderBottom: '1px solid #E5E7EB' }}>
          <TextField
            size="small"
            placeholder="Tìm dataset..."
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
                  onClick={() => handleSelectDataset(dataset.id)}
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
              Dataset đã phát hành &gt;{' '}
              <strong style={{ color: '#111827' }}>{activeDataset?.dataset_name || 'dataset'}</strong>
            </Typography>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={2}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    flexShrink: 0,
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
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>
                      {activeDataset?.dataset_name}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    {preview?.verification ? (
                      <Chip
                        icon={<VerifiedUserIcon sx={{ fontSize: '14px !important' }} />}
                        label={`Kiểm định đạt ${preview.verification.passed}/${preview.verification.total}`}
                        size="small"
                        color={preview.verification.passed === preview.verification.total ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="Chưa có kết quả kiểm định" size="small" variant="outlined" />
                    )}
                    <Typography variant="caption" sx={{ color: '#6B7280', wordBreak: 'break-all' }}>
                      Vị trí snapshot: {activeDataset?.output_location || '—'}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }} flexWrap="wrap" useFlexGap>
                <Tooltip title="Tất cả các bảng của dataset, đủ mọi dòng: mỗi bảng một tệp CSV trong tệp ZIP (đã bảo vệ, không có PII gốc)">
                  <span>
                    <Button
                      variant="contained"
                      size="small"
                      disableElevation
                      sx={{ whiteSpace: 'nowrap' }}
                      startIcon={
                        downloadingTarget === 'all' ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <DownloadIcon sx={{ fontSize: 16 }} />
                        )
                      }
                      disabled={selectedDatasetId === null || downloadingTarget !== null}
                      onClick={() => selectedDatasetId !== null && void handleDownloadDataset(selectedDatasetId, null)}
                    >
                      Tải toàn bộ ({preview?.tables.length ?? 0} bảng, ZIP)
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Chỉ bảng đang xem, đủ mọi dòng (đã bảo vệ, không có PII gốc)">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ whiteSpace: 'nowrap' }}
                      startIcon={
                        downloadingTarget !== null && downloadingTarget !== 'all' ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <DownloadIcon sx={{ fontSize: 16 }} />
                        )
                      }
                      disabled={selectedDatasetId === null || !preview?.selected_table || downloadingTarget !== null}
                      onClick={() =>
                        selectedDatasetId !== null &&
                        void handleDownloadDataset(selectedDatasetId, preview?.selected_table || null)
                      }
                    >
                      Tải CSV bảng {preview?.selected_table || ''}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>

          {/* Databricks Tab Bar */}
          <Tabs
            value={activeTab}
            onChange={(_, val: number) => setActiveTab(val)}
            sx={{ px: 3, bgcolor: '#FFFFFF', minHeight: 44 }}
          >
            <Tab label="Dữ liệu đã bảo vệ" />
            <Tab label="Các cột & cách dùng" />
            <Tab label="Quan hệ giữa các bảng" />
          </Tabs>

          {/* TAB 0: SAMPLE DATA */}
          {activeTab === 0 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {previewLoading ? (
                <MascotLoader compact title="Đang tải dữ liệu đã bảo vệ…" />
              ) : preview ? (
                <Stack spacing={2.5}>
                  <Alert severity="info" sx={{ borderRadius: '6px' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Đây là dữ liệu thật đã được DPO duyệt và bảo vệ. Bạn dùng nó để phân tích, không cần xem PII gốc.
                    </Typography>
                    <Typography variant="body2" component="div">
                      Cách đọc: cột <strong>Giữ nguyên</strong> dùng trực tiếp; cột <strong>Băm HMAC</strong> là mã thay
                      thế cố định, dùng để ghép bảng hoặc đếm; cột <strong>Đã che</strong> chỉ để nhận biết dạng dữ liệu;
                      cột <strong>Đã loại bỏ</strong> không có trong dataset.
                    </Typography>
                  </Alert>

                  {preview.note && (
                    <Typography variant="caption" color="text.secondary">
                      {preview.note}
                    </Typography>
                  )}

                  {/* Table picker + row limit */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Bảng:
                      </Typography>
                      {preview.tables.map((tableName) => (
                        <Chip
                          key={tableName}
                          icon={<TableChartOutlinedIcon />}
                          label={tableName}
                          size="small"
                          clickable
                          color={tableName === preview.selected_table ? 'primary' : 'default'}
                          variant={tableName === preview.selected_table ? 'filled' : 'outlined'}
                          onClick={() => setSelectedTable(tableName)}
                        />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Số dòng hiển thị
                      </Typography>
                      <Select<number>
                        size="small"
                        value={rowLimit}
                        onChange={(event) => setRowLimit(Number(event.target.value))}
                        sx={{ fontSize: '0.8125rem', height: 30 }}
                      >
                        {ROW_LIMIT_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </Stack>
                  </Stack>

                  {/* Summary transform chips for the selected table */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <DatasetStatusBadge status={preview.status} />
                    <Typography variant="caption" color="text.secondary">
                      {preview.rows.length} dòng · {sampleColumns.length} cột
                    </Typography>
                    {droppedInTable.length > 0 && (
                      <Tooltip title={droppedInTable.map((column) => column.name).join(', ')}>
                        <Chip
                          label={`${droppedInTable.length} cột đã loại bỏ`}
                          color="error"
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.72rem', borderRadius: '4px' }}
                        />
                      </Tooltip>
                    )}
                  </Stack>

                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ borderRadius: '6px', maxHeight: 520, overflowX: 'auto' }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 40 }}>#</TableCell>
                          {sampleColumns.map((col) => (
                            <TableCell key={col.name} sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                              <Tooltip title={getTransformAnalystHint(col.transform)}>
                                <Stack spacing={0.5} alignItems="flex-start">
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <TextFieldsIcon sx={{ fontSize: 14 }} color="disabled" />
                                    <span>{col.name}</span>
                                  </Stack>
                                  <TransformChip transform={col.transform} />
                                </Stack>
                              </Tooltip>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={sampleColumns.length + 1}>
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                Bảng này chưa có dòng dữ liệu nào.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          preview.rows.map((row, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{idx + 1}</TableCell>
                              {sampleColumns.map((col) => (
                                <TableCell
                                  key={col.name}
                                  sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                                >
                                  {formatPreviewValue(row[col.name])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
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
                      <TableCell>Analyst dùng cột này để làm gì</TableCell>
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
                                sx={{ color: col.transform === 'DROPPED' ? 'error.main' : 'text.secondary' }}
                              >
                                {getTransformAnalystHint(col.transform)}
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
                  Sơ đồ quan hệ giữa các bảng
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Trực quan hóa cấu trúc bảng, kiểu dữ liệu, khóa chính (PK), khóa ngoại (FK) và liên kết khóa băm HMAC an toàn.
                </Typography>
              </Box>
              <ErdLineageDiagram preview={preview} />
              <JoinExamples preview={preview} />
            </Box>
          )}

        </Paper>
      </Box>
    </Box>
  );
}
