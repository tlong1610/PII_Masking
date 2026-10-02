import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DatasetIcon from '@mui/icons-material/Dataset';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PolicyIcon from '@mui/icons-material/Policy';
import ShieldIcon from '@mui/icons-material/Shield';

import { ApiError } from '@/shared/api/client';

import { AddSourceDialog } from './AddSourceDialog';
import { CollapsibleTableGroup } from './CollapsibleTableGroup';
import { ActionChip } from './PolicyChips';
import {
  POLICY_ACTIONS,
  type PolicyAction,
  getActionColor,
  getActionLabel,
  getClassificationLabel,
  getCoverageStatusLabel,
  getDetectorSourceLabel,
  getRiskLabel,
  getRiskTone,
} from '../model/policyLabels';
import { isUserSource } from '../model/sourceForm';
import {
  useBuildDataset,
  useCreateScanRun,
  useDataSources,
  useDeleteDataSource,
  usePublishDataset,
  useRun,
  useSourceScope,
  useUpdateFieldDecisions,
} from '../hooks/usePiiReview';

type Step = 'select-source' | 'scan-running' | 'review' | 'build' | 'done';
type ActionFilter = PolicyAction | 'ALL';
type GroupTone = 'primary' | 'secondary' | 'info' | 'success' | 'warning';

const GROUP_TONES: GroupTone[] = ['primary', 'secondary', 'info', 'success', 'warning'];

function getDecisionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Không thể lưu quyết định. Vui lòng thử lại.';
}

function isUnknownField(classification: string): boolean {
  return classification.includes('UNKNOWN');
}

function isHmacLockedField(field: { recommended_action: PolicyAction }): boolean {
  return field.recommended_action === 'HMAC';
}

function getGroupTone(index: number): GroupTone {
  return GROUP_TONES[index % GROUP_TONES.length] ?? 'primary';
}

export function DpoReviewExperienceMVP(): JSX.Element {
  const [step, setStep] = useState<Step>('select-source');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<string[]>([]);
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [decisionOverrides, setDecisionOverrides] = useState<Record<number, PolicyAction>>({});
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [collapsedSources, setCollapsedSources] = useState<Record<string, boolean>>({});
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const { data: sources, isLoading: sourcesLoading } = useDataSources();
  const { data: sourceScope, isLoading: scopeLoading } = useSourceScope(selectedSourceId);
  const { data: currentRun, isLoading: runLoading } = useRun(currentRunId);

  const createScan = useCreateScanRun();
  const deleteSource = useDeleteDataSource();
  const updateDecisions = useUpdateFieldDecisions(currentRunId || 0);
  const buildDataset = useBuildDataset(currentRunId || 0);
  const publishDataset = usePublishDataset();

  const fields = useMemo(() => currentRun?.field_profiles ?? [], [currentRun?.field_profiles]);

  const getFieldAction = useCallback(
    (fieldId: number, recommendedAction: PolicyAction): PolicyAction =>
      decisionOverrides[fieldId] ?? recommendedAction,
    [decisionOverrides],
  );

  const actionCounts = useMemo(
    () =>
      fields.reduce<Record<PolicyAction, number>>(
        (counts, field) => {
          const action = getFieldAction(field.id, field.recommended_action);
          return { ...counts, [action]: counts[action] + 1 };
        },
        { MASK: 0, HMAC: 0, DROP: 0, KEEP: 0 },
      ),
    [fields, getFieldAction],
  );

  const highRiskCount = useMemo(
    () => fields.filter((field) => field.classification.includes('SENSITIVE')).length,
    [fields],
  );

  const reviewRequiredCount = useMemo(
    () =>
      fields.filter(
        (field) =>
          field.classification.includes('UNKNOWN') || field.coverage_status === 'REVIEW_REQUIRED',
      ).length,
    [fields],
  );

  const displayedFields = useMemo(
    () =>
      fields.filter((field) => {
        const action = getFieldAction(field.id, field.recommended_action);
        return actionFilter === 'ALL' || action === actionFilter;
      }),
    [actionFilter, fields, getFieldAction],
  );

  const displayedFieldGroups = useMemo(() => {
    const grouped = new Map<string, typeof displayedFields>();

    displayedFields.forEach((field) => {
      const current = grouped.get(field.source_path) ?? [];
      grouped.set(field.source_path, [...current, field]);
    });

    return Array.from(grouped.entries()).map(([sourcePath, groupFields], index) => ({
      sourcePath,
      fields: groupFields,
      tone: getGroupTone(index),
      attentionCount: groupFields.filter(
        (field) =>
          field.classification.includes('UNKNOWN') || field.coverage_status === 'REVIEW_REQUIRED',
      ).length,
    }));
  }, [displayedFields]);

  const sourceCount = useMemo(
    () => new Set(fields.map((field) => field.source_path)).size,
    [fields],
  );

  const completionPercent = fields.length > 0 ? 100 : 0;
  const editedCount = Object.keys(decisionOverrides).length;

  const handleSelectSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setSelectedScope([]);
  };

  const handleToggleScopeItem = (name: string) => {
    setSelectedScope((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const handleStartScan = async () => {
    if (!selectedSourceId || selectedScope.length === 0) return;

    setStep('scan-running');
    setDecisionOverrides({});
    setActionFilter('ALL');
    setBuildError(null);

    try {
      const run = await createScan.mutateAsync({
        sourceId: selectedSourceId,
        selectedScope,
      });
      setCurrentRunId(run.id);

      setTimeout(() => {
        setStep('review');
      }, 2000);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Lỗi khi quét dữ liệu');
      setStep('select-source');
    }
  };

  const handleFieldActionChange = (fieldId: number, action: PolicyAction) => {
    setDecisionError(null);
    setBuildError(null);
    setDecisionOverrides((current) => ({ ...current, [fieldId]: action }));
  };

  const handleBulkAction = (action: PolicyAction) => {
    setDecisionError(null);
    setBuildError(null);
    setDecisionOverrides((current) =>
      displayedFields.reduce<Record<number, PolicyAction>>(
        (next, field) => {
          const nextAction =
            isHmacLockedField(field) || (action === 'KEEP' && isUnknownField(field.classification))
              ? field.recommended_action
              : action;
          return { ...next, [field.id]: nextAction };
        },
        current,
      ),
    );
  };

  const handleToggleSource = (sourcePath: string) => {
    setCollapsedSources((current) => ({
      ...current,
      [sourcePath]: !current[sourcePath],
    }));
  };

  const handleSetAllSourcesCollapsed = (collapsed: boolean) => {
    setCollapsedSources(
      displayedFieldGroups.reduce<Record<string, boolean>>(
        (next, group) => ({ ...next, [group.sourcePath]: collapsed }),
        {},
      ),
    );
  };

  const handleApprove = async () => {
    if (!currentRunId || !currentRun) return;

    try {
      setDecisionError(null);
      setBuildError(null);
      await updateDecisions.mutateAsync(
        fields.map((field) => {
          const action = getFieldAction(field.id, field.recommended_action);
          return {
            field_profile_id: field.id,
            action,
            reason:
              action === field.recommended_action
                ? `DPO accepted suggested ${action} policy for ${field.field_path}`
                : `DPO changed policy to ${action} for ${field.field_path}`,
          };
        }),
      );
      setStep('build');
    } catch (error) {
      console.error('Approve failed:', error);
      setDecisionError(getDecisionErrorMessage(error));
    }
  };

  const handleBuild = async () => {
    if (!currentRunId) return;

    try {
      setBuildError(null);
      const result = await buildDataset.mutateAsync();
      setDatasetId(result.dataset.id);
      setStep('done');
    } catch (error) {
      console.error('Build failed:', error);
      setBuildError(getDecisionErrorMessage(error));
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

  const handleDeleteSource = async (sourceId: string): Promise<void> => {
    setSourceError(null);
    try {
      await deleteSource.mutateAsync(sourceId);
      if (selectedSourceId === sourceId) setSelectedSourceId(null);
    } catch (error) {
      setSourceError(error instanceof ApiError ? error.message : 'Không thể xóa nguồn dữ liệu.');
    }
  };

  if (sourcesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (step === 'select-source') {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
          <Box>
            <Typography variant="h4" gutterBottom>
              Chọn nguồn dữ liệu
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Chọn nguồn dữ liệu để quét và phát hiện PII, hoặc thêm cơ sở dữ liệu của bạn bằng connection URL.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddSourceOpen(true)}>
            Thêm nguồn
          </Button>
        </Box>

        {sourceError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSourceError(null)}>
            {sourceError}
          </Alert>
        )}

        <AddSourceDialog
          open={addSourceOpen}
          onClose={() => setAddSourceOpen(false)}
          onCreated={(sourceId) => handleSelectSource(sourceId)}
        />

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
                      {isUserSource(source.id) && (
                        <IconButton
                          size="small"
                          aria-label={`Xóa nguồn ${source.name}`}
                          sx={{ ml: 'auto' }}
                          disabled={deleteSource.isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteSource(source.id);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
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
          <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Chọn phạm vi quét
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Backend chỉ scan các bảng/collection được chọn. Không hiển thị raw value.
                </Typography>
              </Box>

              {scopeLoading ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Đang đọc scope...
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={1}>
                  {sourceScope?.items.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.name}>
                      <Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedScope.includes(item.name)}
                              onChange={() => handleToggleScopeItem(item.name)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontFamily="monospace">
                                {item.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.kind} • {item.field_count} fields
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}

              {sourceScope && sourceScope.items.length === 0 && (
                <Alert severity="warning">
                  Source này chưa đọc được bảng/collection để quét.
                </Alert>
              )}

              <Box>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => void handleStartScan()}
                  disabled={createScan.isPending || scopeLoading || selectedScope.length === 0}
                >
                  Bắt đầu quét PII
                </Button>
              </Box>
            </Stack>
          </Paper>
        )}
      </Box>
    );
  }

  if (step === 'scan-running') {
    return (
      <Box textAlign="center" py={8}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" gutterBottom>
          Đang quét dữ liệu...
        </Typography>
        <Typography color="text.secondary">
          Hệ thống đang phát hiện field nhạy cảm và chuẩn bị gợi ý policy.
        </Typography>
      </Box>
    );
  }

  if (step === 'review' && currentRun) {
    return (
      <Box>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              DPO policy workspace
            </Typography>
            <Typography color="text.secondary">
              Review theo nhóm rủi ro, chỉnh action hàng loạt hoặc từng field.
            </Typography>
          </Box>
          <Chip icon={<PolicyIcon />} label={`Policy ${currentRun.policy_version}`} color="primary" />
        </Stack>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1}>
                <ShieldIcon color="primary" />
                <Typography variant="h5">{fields.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Fields detected in {sourceCount} tables
                </Typography>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1}>
                <FactCheckIcon color="error" />
                <Typography variant="h5">{highRiskCount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  High-risk fields
                </Typography>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1}>
                <FilterListIcon color="warning" />
                <Typography variant="h5">{reviewRequiredCount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Need DPO attention
                </Typography>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1}>
                <AutoFixHighIcon color="success" />
                <Typography variant="h5">{editedCount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Manual overrides
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Box sx={{ p: 2 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  justifyContent="space-between"
                >
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 220 } }}>
                    <InputLabel id="action-filter-label">Lọc hành động</InputLabel>
                    <Select
                      labelId="action-filter-label"
                      value={actionFilter}
                      label="Lọc hành động"
                      onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
                    >
                      <MenuItem value="ALL">Tất cả hành động</MenuItem>
                      {POLICY_ACTIONS.map((action) => (
                        <MenuItem value={action} key={action}>
                          {getActionLabel(action)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleSetAllSourcesCollapsed(false)}
                    >
                      Mở tất cả
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleSetAllSourcesCollapsed(true)}
                    >
                      Thu gọn tất cả
                    </Button>
                    {POLICY_ACTIONS.map((action) => (
                      <Button
                        key={action}
                        size="small"
                        variant="outlined"
                        color={getActionColor(action)}
                        onClick={() => handleBulkAction(action)}
                      >
                        Áp dụng {getActionLabel(action)}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              <TableContainer sx={{ maxHeight: 560 }}>
                <Table stickyHeader size="small" aria-label="DPO field policy decisions">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'background.paper', zIndex: 2 }}>Field</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper', zIndex: 2 }}>Risk</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper', zIndex: 2 }}>Profile</TableCell>
                      <TableCell width={160} sx={{ bgcolor: 'background.paper', zIndex: 2 }}>
                        Decision
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedFieldGroups.map((group) => (
                      <CollapsibleTableGroup
                        key={group.sourcePath}
                        collapsed={Boolean(collapsedSources[group.sourcePath])}
                        colSpan={4}
                        countLabel={`${group.fields.length} fields`}
                        onToggle={() => handleToggleSource(group.sourcePath)}
                        sourcePath={group.sourcePath}
                        tone={group.tone}
                        summary={
                          group.attentionCount > 0 ? (
                            <Chip
                              label={`${group.attentionCount} cần kiểm tra`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          ) : undefined
                        }
                      >
                        {group.fields.map((field) => {
                          const action = getFieldAction(field.id, field.recommended_action);
                          const wasEdited = action !== field.recommended_action;
                          const keepDisabled = isUnknownField(field.classification);
                          const hmacLocked = isHmacLockedField(field);

                          return (
                            <TableRow key={field.id} hover>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant="body2" fontFamily="monospace">
                                    {field.field_path}
                                  </Typography>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip label={field.data_type} size="small" variant="outlined" />
                                    <Chip
                                      label={getDetectorSourceLabel(field.detector_source)}
                                      size="small"
                                      variant="outlined"
                                    />
                                    <Chip
                                      label={getCoverageStatusLabel(field.coverage_status)}
                                      size="small"
                                      variant="outlined"
                                    />
                                    {wasEdited && (
                                      <Chip label="edited" size="small" color="primary" />
                                    )}
                                  </Stack>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.75}>
                                  <Chip
                                    label={getRiskLabel(field.classification)}
                                    size="small"
                                    color={getRiskTone(field.classification)}
                                    sx={{ width: 'fit-content' }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {getClassificationLabel(field.classification)}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {field.profile_summary}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={action}
                                    onChange={(event) =>
                                      handleFieldActionChange(
                                        field.id,
                                        event.target.value as PolicyAction,
                                      )
                                    }
                                    aria-label={`Decision for ${group.sourcePath}.${field.field_path}`}
                                  >
                                    {POLICY_ACTIONS.map((option) => (
                                      <MenuItem
                                        value={option}
                                        key={option}
                                        disabled={
                                          (option === 'KEEP' && keepDisabled) ||
                                          (hmacLocked && option !== 'HMAC')
                                        }
                                      >
                                        {getActionLabel(option)}
                                        {option === 'KEEP' && keepDisabled ? ' (bị chặn)' : ''}
                                        {hmacLocked && option !== 'HMAC' ? ' (khóa HMAC)' : ''}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </CollapsibleTableGroup>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper variant="outlined" sx={{ p: 2, position: { lg: 'sticky' }, top: { lg: 16 } }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Build readiness
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All detected fields have a policy decision. Raw PII values are not shown here.
                  </Typography>
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2">Decision coverage</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {completionPercent}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={completionPercent} />
                </Box>

                <Divider />

                <Stack spacing={1}>
                  {POLICY_ACTIONS.map((action) => (
                    <Stack direction="row" justifyContent="space-between" key={action}>
                      <ActionChip action={action} />
                      <Typography fontWeight={700}>{actionCounts[action]}</Typography>
                    </Stack>
                  ))}
                </Stack>

                <Alert severity={reviewRequiredCount > 0 ? 'warning' : 'success'}>
                  {reviewRequiredCount > 0
                    ? `${reviewRequiredCount} field cần DPO kiểm tra kỹ trước khi build.`
                    : 'Không còn field cần review thủ công.'}
                </Alert>

                {decisionError && (
                  <Alert severity="error">
                    {decisionError}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => void handleApprove()}
                  disabled={updateDecisions.isPending || fields.length === 0}
                  fullWidth
                >
                  {updateDecisions.isPending ? 'Đang lưu quyết định...' : 'Approve decisions'}
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (step === 'build') {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h5" gutterBottom>
          Đã duyệt thành công
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Bây giờ bạn có thể xây dựng dataset được bảo vệ.
        </Typography>

        {buildError && (
          <Alert severity="error" sx={{ maxWidth: 720, mx: 'auto', mb: 3, textAlign: 'left' }}>
            {buildError}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={() => void handleBuild()}
          disabled={buildDataset.isPending}
        >
          {buildDataset.isPending ? 'Đang xây dựng...' : 'Xây dựng dataset'}
        </Button>
      </Box>
    );
  }

  if (step === 'done' && datasetId) {
    return (
      <Box textAlign="center" py={8}>
        <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Hoàn thành
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
              setSelectedScope([]);
              setCurrentRunId(null);
              setDatasetId(null);
              setDecisionOverrides({});
              setActionFilter('ALL');
            }}
          >
            Quét nguồn mới
          </Button>
          <Button
            variant="contained"
            onClick={() => void handlePublish()}
            disabled={publishDataset.isPending}
          >
            {publishDataset.isPending ? 'Đang publish...' : 'Publish dataset'}
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
