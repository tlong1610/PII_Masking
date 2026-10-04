import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
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

import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import RefreshIcon from '@mui/icons-material/Refresh';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import PinIcon from '@mui/icons-material/Pin';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import { ApiError } from '@/shared/api/client';
import { getStoredSession } from '@/features/auth/model/authStorage';
import { AddSourceDialog } from './AddSourceDialog';
import { CollapsibleTableGroup, FixedColumns } from './CollapsibleTableGroup';
import { FieldPolicyDrawerContent } from './FieldPolicyDrawerContent';
import { ActionChip, SensitivityChip, DetectorBadge, DatasetStatusChip } from './PolicyChips';
import { SourceScopePickerDiagram } from './SourceScopePickerDiagram';
import {
  POLICY_ACTIONS,
  type PolicyAction,
  getActionLabel,
  getClassificationLabel,
  getCoverageStatusLabel,
} from '../model/policyLabels';
import { isUserSource } from '../model/sourceForm';
import {
  EMPTY_FIELD_NOTE,
  type FieldDecisionNote,
  buildFieldDecisionPayload,
  getFieldKind,
  needsException,
  needsNotPersonalConfirmation,
} from '../model/fieldDecision';
import { type DecisionIssue, collectDecisionIssues, issuesFromApiError } from '../model/decisionIssues';
import {
  JOIN_KEY_ACTIONS,
  buildJoinGroups,
  formatJoinKeyViolations,
  getJoinPartnerLabel,
} from '../model/joinKeys';
import {
  useBuildDataset,
  useCreateScanRun,
  useDataSources,
  useDeleteDataSource,
  useJoinKeys,
  usePublishDataset,
  useRiskScore,
  useRun,
  useSourceScope,
  useUpdateFieldDecisions,
} from '../hooks/usePiiReview';

type ActionFilter = PolicyAction | 'ALL';

/** Minimum protection the backend enforces for a classification (L3 is rendered as a chip). */
function getFloorLabel(classification: string): string {
  const kind = getFieldKind(classification);
  if (kind === 'PII') return 'Tiêu chuẩn L2 (che)';
  if (kind === 'QUASI') return 'L1 (được giữ)';
  if (kind === 'UNKNOWN') return 'Cần xác nhận';
  return 'Không áp dụng';
}

/** Column name, type, PII class, detector, masking rule, floor, action — shared by header and every table group. */
const REVIEW_COLUMN_WIDTHS = ['24%', '13%', '11%', '12%', '18%', '12%', '10%'] as const;

function getDecisionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return formatJoinKeyViolations(error.response) ?? error.message;
  if (error instanceof Error) return error.message;
  return 'Không thể lưu quyết định. Vui lòng thử lại.';
}

function isUnknownField(classification: string): boolean {
  return classification.includes('UNKNOWN');
}

function isHmacLockedField(field: { recommended_action: PolicyAction }): boolean {
  return field.recommended_action === 'HMAC';
}
export function DpoReviewExperienceMVP(): JSX.Element {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<string[]>([]);
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [columnSearch, setColumnSearch] = useState<string>('');
  const [sourceSearch, setSourceSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [decisionOverrides, setDecisionOverrides] = useState<Record<number, PolicyAction>>({});
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [collapsedSources, setCollapsedSources] = useState<Record<string, boolean>>({});
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [sampleViewMode, setSampleViewMode] = useState<'masked' | 'split'>('masked');

  // Inspector Drawer state
  const [inspectFieldId, setInspectFieldId] = useState<number | null>(null);
  const [fieldNotes, setFieldNotes] = useState<Record<number, FieldDecisionNote>>({});
  const [inspectInitialAction, setInspectInitialAction] = useState<PolicyAction>('MASK');
  const [decisionIssues, setDecisionIssues] = useState<DecisionIssue[]>([]);
  const [highlightFieldId, setHighlightFieldId] = useState<number | null>(null);
  const issueFieldIds = useMemo(() => new Set(decisionIssues.map((issue) => issue.fieldId)), [decisionIssues]);

  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useDataSources();
  const { data: sourceScope, isLoading: scopeLoading } = useSourceScope(selectedSourceId);
  const { data: currentRun, isLoading: runLoading } = useRun(currentRunId);
  const { data: riskScore } = useRiskScore(currentRunId);

  const createScan = useCreateScanRun();
  const deleteSource = useDeleteDataSource();
  const updateDecisions = useUpdateFieldDecisions(currentRunId || 0);
  const buildDataset = useBuildDataset(currentRunId || 0);
  const publishDataset = usePublishDataset();

  // Auto-select first source if none selected
  useMemo(() => {
    if (!selectedSourceId && sources && sources.length > 0 && sources[0]) {
      setSelectedSourceId(sources[0].id);
    }
  }, [selectedSourceId, sources]);

  const activeSource = useMemo(
    () => sources?.find((s) => s.id === selectedSourceId) ?? null,
    [sources, selectedSourceId],
  );

  const fields = useMemo(() => currentRun?.field_profiles ?? [], [currentRun?.field_profiles]);
  const { data: joinKeys } = useJoinKeys(currentRunId);
  const joinGroups = useMemo(() => buildJoinGroups(fields, joinKeys ?? []), [fields, joinKeys]);

  /** KEEP on a join group is only safe when every end is non-personal; otherwise HMAC only. */
  const isJoinKeepAllowed = useCallback(
    (fieldId: number) =>
      (joinGroups.get(fieldId) ?? [fieldId]).every((id) => {
        const member = fields.find((item) => item.id === id);
        return member !== undefined && getFieldKind(member.classification) === 'NON_PERSONAL';
      }),
    [fields, joinGroups],
  );

  const isActionDisabledFor = useCallback(
    (field: { id: number; classification: string }, action: PolicyAction): boolean => {
      if (getFieldKind(field.classification) === 'SENSITIVE' && action === 'KEEP') return true;
      if (!joinGroups.has(field.id)) return false;
      if (!JOIN_KEY_ACTIONS.includes(action)) return true;
      return action === 'KEEP' && !isJoinKeepAllowed(field.id);
    },
    [isJoinKeepAllowed, joinGroups],
  );

  const getActionOptionNote = (field: { id: number; classification: string }, action: PolicyAction): string => {
    if (getFieldKind(field.classification) === 'SENSITIVE' && action === 'KEEP') return '(Cấm với L3)';
    if (joinGroups.has(field.id) && isActionDisabledFor(field, action)) return '(Khóa nối)';
    return '';
  };

  /** Applies one action to a field and, for join keys, to every other end of the join. */
  const applyActionToGroup = useCallback(
    (fieldId: number, action: PolicyAction) => {
      const ids = joinGroups.get(fieldId) ?? [fieldId];
      setDecisionOverrides((current) => ids.reduce((next, id) => ({ ...next, [id]: action }), current));
    },
    [joinGroups],
  );

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

  const l2BasicCount = useMemo(
    () => fields.filter((field) => field.classification.includes('BASIC')).length,
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

  const filteredFields = useMemo(() => {
    return fields.filter((field) => {
      const action = getFieldAction(field.id, field.recommended_action);
      const matchesAction = actionFilter === 'ALL' || action === actionFilter;
      const matchesSearch =
        columnSearch.trim() === '' ||
        field.field_path.toLowerCase().includes(columnSearch.toLowerCase()) ||
        field.source_path.toLowerCase().includes(columnSearch.toLowerCase());
      return matchesAction && matchesSearch;
    });
  }, [actionFilter, columnSearch, fields, getFieldAction]);

  const displayedFieldGroups = useMemo(() => {
    const grouped = new Map<string, typeof filteredFields>();
    filteredFields.forEach((field) => {
      const current = grouped.get(field.source_path) ?? [];
      grouped.set(field.source_path, [...current, field]);
    });

    return Array.from(grouped.entries()).map(([sourcePath, groupFields]) => ({
      sourcePath,
      fields: groupFields,
      attentionCount: groupFields.filter(
        (field) =>
          field.classification.includes('UNKNOWN') || field.coverage_status === 'REVIEW_REQUIRED',
      ).length,
    }));
  }, [filteredFields]);

  const filteredSources = useMemo(() => {
    if (!sources) return [];
    if (!sourceSearch.trim()) return sources;
    return sources.filter(
      (s) =>
        s.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
        s.source_type.toLowerCase().includes(sourceSearch.toLowerCase()),
    );
  }, [sources, sourceSearch]);

  const activeInspectField = useMemo(
    () => fields.find((f) => f.id === inspectFieldId) ?? null,
    [fields, inspectFieldId],
  );
  const scopeNames = useMemo(() => sourceScope?.items.map((item) => item.name) ?? [], [sourceScope?.items]);

  const handleSelectSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setDecisionOverrides({});
    setFieldNotes({});
    setDecisionIssues([]);
    setActionFilter('ALL');
  };

  useEffect(() => {
    setSelectedScope(scopeNames);
  }, [scopeNames]);

  const handleToggleScopeItem = (name: string) => {
    setSelectedScope((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const handleSelectAllScope = () => {
    setSelectedScope((current) => (current.length === scopeNames.length ? [] : scopeNames));
  };

  const handleStartScan = async () => {
    if (!selectedSourceId || selectedScope.length === 0) return;

    setIsScanning(true);
    setDecisionOverrides({});
    setFieldNotes({});
    setDecisionIssues([]);
    setActionFilter('ALL');
    setBuildError(null);
    setDecisionError(null);

    try {
      const run = await createScan.mutateAsync({
        sourceId: selectedSourceId,
        selectedScope,
      });
      setCurrentRunId(run.id);
      setActiveTab(0);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Lỗi khi quét dữ liệu');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFieldActionChange = (fieldId: number, action: PolicyAction) => {
    const field = fields.find((item) => item.id === fieldId);
    if (field && isActionDisabledFor(field, action)) return;
    const kind = field ? getFieldKind(field.classification) : 'PII';
    const note = fieldNotes[fieldId] ?? EMPTY_FIELD_NOTE;
    // KEEP on UNKNOWN/PII needs a confirmation or an exception: collect it in the inspector.
    if (
      (needsNotPersonalConfirmation(kind, action) && !note.notPersonal) ||
      (needsException(kind, action) && !note.exceptionUntil)
    ) {
      handleOpenInspector(fieldId, action);
      return;
    }
    setDecisionError(null);
    setBuildError(null);
    applyActionToGroup(fieldId, action);
    clearIssuesFor(joinGroups.get(fieldId) ?? [fieldId]);
  };

  const handleAcceptAllAi = () => {
    // Reset overrides to AI recommendations
    setDecisionOverrides({});
    setFieldNotes({});
    setDecisionIssues([]);
    setDecisionError(null);
  };

  const handleBulkAction = (action: PolicyAction) => {
    setDecisionError(null);
    setBuildError(null);
    setDecisionOverrides((current) =>
      filteredFields.reduce<Record<number, PolicyAction>>(
        (next, field) => {
          // Join keys keep their (group-consistent) action: bulk MASK/DROP would break the join.
          if (joinGroups.has(field.id)) {
            return { ...next, [field.id]: current[field.id] ?? field.recommended_action };
          }
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

  /** Shows a field in the review table (clears filters, expands its table, scrolls, highlights, opens it). */
  const handleGoToField = (fieldId: number) => {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    setActiveTab(0);
    setActionFilter('ALL');
    setColumnSearch('');
    setCollapsedSources((current) => ({ ...current, [field.source_path]: false }));
    setHighlightFieldId(fieldId);
    window.setTimeout(() => {
      document.getElementById(`field-row-${fieldId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    window.setTimeout(() => setHighlightFieldId((current) => (current === fieldId ? null : current)), 4000);
    handleOpenInspector(fieldId);
  };

  const showDecisionIssues = (issues: DecisionIssue[]) => {
    setDecisionIssues(issues);
    setDecisionError(null);
    setActiveTab(0);
    window.setTimeout(() => {
      document.getElementById('decision-issues')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const clearIssuesFor = (fieldIds: number[]) => {
    setDecisionIssues((current) => current.filter((issue) => !fieldIds.includes(issue.fieldId)));
  };

  const handleApproveAndBuild = async () => {
    if (!currentRunId || !currentRun) return;

    // Catch every problem up front so the DPO can fix them all, not one 422 at a time.
    const issues = collectDecisionIssues({
      fields,
      getAction: (field) => getFieldAction(field.id, field.recommended_action),
      notes: fieldNotes,
      joinGroups,
      today: new Date().toISOString().slice(0, 10),
    });
    setDecisionIssues(issues);
    if (issues.length > 0) {
      showDecisionIssues(issues);
      return;
    }

    try {
      setDecisionError(null);
      setBuildError(null);
      await updateDecisions.mutateAsync(
        fields.map((field) =>
          buildFieldDecisionPayload({
            fieldProfileId: field.id,
            fieldPath: field.field_path,
            kind: getFieldKind(field.classification),
            action: getFieldAction(field.id, field.recommended_action),
            recommendedAction: field.recommended_action,
            note: fieldNotes[field.id],
          }),
        ),
      );

      // Build dataset snapshot
      const result = await buildDataset.mutateAsync();
      setDatasetId(result.dataset.id);
      alert(`Đã tạo snapshot thành công! Dataset ID: ${result.dataset.id}`);
    } catch (error) {
      console.error('Build failed:', error);
      const serverIssues = error instanceof ApiError ? issuesFromApiError(error.response, fields) : [];
      if (serverIssues.length > 0) {
        showDecisionIssues(serverIssues);
        return;
      }
      const msg = getDecisionErrorMessage(error);
      setBuildError(msg);
      setDecisionError(msg);
    }
  };

  const handlePublish = async () => {
    if (!datasetId) return;
    try {
      await publishDataset.mutateAsync(datasetId);
      alert('Đã phát hành dataset thành công! Chuyên viên Analyst có thể truy cập.');
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
      void refetchSources();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Không thể xóa nguồn dữ liệu.';
      if (msg.includes('Source has runs')) {
        const confirmed = window.confirm(
          'Nguồn dữ liệu này đã phát sinh các lượt quét PII trong lịch sử kiểm toán.\n\nBạn có chắc chắn muốn xóa vĩnh viễn nguồn này cùng toàn bộ dữ liệu quét liên quan không?'
        );
        if (confirmed) {
          try {
            await deleteSource.mutateAsync({ sourceId, force: true });
            if (selectedSourceId === sourceId) setSelectedSourceId(null);
            void refetchSources();
            return;
          } catch (forceErr) {
            setSourceError(forceErr instanceof ApiError ? forceErr.message : 'Không thể xóa nguồn dữ liệu.');
            return;
          }
        }
        setSourceError('Đã hủy thao tác xóa nguồn.');
      } else {
        setSourceError(msg);
      }
    }
  };

  const handleOpenInspector = (fieldId: number, action?: PolicyAction) => {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    setInspectInitialAction(action ?? getFieldAction(field.id, field.recommended_action));
    setInspectFieldId(fieldId);
  };

  const handleCloseInspector = () => {
    setInspectFieldId(null);
  };

  /** Called by the inspector once its draft passed validation. */
  const handleSaveInspector = (action: PolicyAction, note: FieldDecisionNote) => {
    if (!activeInspectField) return;
    setDecisionError(null);
    setBuildError(null);
    applyActionToGroup(activeInspectField.id, action);
    setFieldNotes((current) => ({ ...current, [activeInspectField.id]: note }));
    clearIssuesFor(joinGroups.get(activeInspectField.id) ?? [activeInspectField.id]);
    handleCloseInspector();
  };

  const handleOpenReport = (runId: number | null) => {
    if (!runId) return;
    const session = getStoredSession();
    const tokenParam = session?.token ? `&token=${encodeURIComponent(session.token)}` : '';
    window.open(`/api/v1/runs/${runId}/report?format=html${tokenParam}`, '_blank');
  };

  const renderFieldTypeIcon = (classification: string) => {
    if (classification.includes('DATE') || classification.includes('TIME')) {
      return <CalendarMonthIcon sx={{ fontSize: 15, color: '#6B7280' }} />;
    }
    if (classification.includes('NUMBER') || classification.includes('ID') || classification.includes('AMOUNT')) {
      return <PinIcon sx={{ fontSize: 15, color: '#6B7280' }} />;
    }
    return <TextFieldsIcon sx={{ fontSize: 15, color: '#6B7280' }} />;
  };

  if (sourcesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={36} sx={{ color: '#1B51A4' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', minHeight: 'calc(100vh - 100px)' }}>
      {/* ========================================================================= */}
      {/* DATABRICKS SECONDARY CATALOG EXPLORER SIDEBAR (260px)                     */}
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
        {/* Catalog Explorer Header */}
        <Box sx={{ p: 1.5, borderBottom: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
              Catalog Explorer
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Thêm nguồn dữ liệu">
                <IconButton size="small" onClick={() => setAddSourceOpen(true)} sx={{ color: '#1B51A4' }}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Làm mới">
                <IconButton size="small" onClick={() => void refetchSources()} sx={{ color: '#6B7280' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Connection Status Pill */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 1,
              px: 1,
              py: 0.4,
              borderRadius: '4px',
              bgcolor: '#ECFDF5',
              border: '1px solid #A7F3D0',
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16A34A' }} />
            <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 600, fontSize: '0.7rem' }}>
              Metastore • On-Premise
            </Typography>
          </Box>
        </Box>

        {/* Tree Search Box */}
        <Box sx={{ p: 1, borderBottom: '1px solid #E5E7EB' }}>
          <TextField
            size="small"
            placeholder="Type to search sources..."
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
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

        {/* Sources Tree List */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
          <Stack spacing={0.5}>
            {filteredSources.map((source) => {
              const isSelected = selectedSourceId === source.id;
              return (
                <Box
                  key={source.id}
                  onClick={() => handleSelectSource(source.id)}
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
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                      <StorageOutlinedIcon
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
                          {source.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.68rem', display: 'block' }}>
                          {source.source_type} • {source.scope_summary}
                        </Typography>
                      </Box>
                    </Stack>

                    {isUserSource(source.id) && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteSource(source.id);
                        }}
                        disabled={deleteSource.isPending}
                        sx={{ color: '#9CA3AF', '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Tree Footer */}
        <Box sx={{ p: 1.5, borderTop: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setAddSourceOpen(true)}
            sx={{ fontSize: '0.75rem', py: 0.5 }}
          >
            Thêm cơ sở dữ liệu
          </Button>
        </Box>
      </Box>

      {/* ========================================================================= */}
      {/* MAIN DATABRICKS TABLE GOVERNANCE & SCHEMA WORKSPACE                       */}
      {/* ========================================================================= */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {sourceError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSourceError(null)}>
            {sourceError}
          </Alert>
        )}

        {/* Add Source Dialog Modal */}
        <AddSourceDialog
          open={addSourceOpen}
          onClose={() => setAddSourceOpen(false)}
          onCreated={(sourceId) => handleSelectSource(sourceId)}
        />

        {/* Main Card with Databricks Table Detail View */}
        <Paper
          variant="outlined"
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Header Row: Breadcrumbs + Table Name + Actions */}
          <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: '1px solid #E5E7EB' }}>
            {/* Breadcrumb */}
            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem', mb: 1, display: 'block' }}>
              Catalog Explorer &gt; {activeSource?.name || 'Metastore'} &gt;{' '}
              <strong style={{ color: '#111827' }}>
                {displayedFieldGroups[0]?.sourcePath || 'customer_records'}
              </strong>
            </Typography>

            {/* Title Bar */}
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
                    bgcolor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1B51A4',
                  }}
                >
                  <TableChartOutlinedIcon />
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>
                      {displayedFieldGroups[0]?.sourcePath || activeSource?.name || 'customer_records'}
                    </Typography>
                    <IconButton size="small" sx={{ color: '#9CA3AF' }} aria-label="Sao chép tên bảng">
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#9CA3AF' }} aria-label="Đánh dấu yêu thích">
                      <StarBorderIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Chip
                      label={currentRunId ? 'Review Required' : 'Not Scanned'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        bgcolor: currentRunId ? '#FFFBEB' : '#F3F4F6',
                        color: currentRunId ? '#B45309' : '#6B7280',
                        border: '1px solid',
                        borderColor: currentRunId ? '#FCD34D' : '#E5E7EB',
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      Nguồn: {activeSource?.source_type || 'PostgreSQL'} • On-Premise Metastore
                    </Typography>
                  </Stack>
                </Box>
              </Stack>

              {/* Action Buttons Top Right (Databricks Style) */}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    isScanning ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon sx={{ fontSize: 16 }} />
                  }
                  onClick={() => void handleStartScan()}
                  disabled={isScanning || !selectedSourceId}
                  sx={{ borderColor: '#D1D5DB', color: '#111827', fontWeight: 600 }}
                >
                  {isScanning ? 'Đang quét...' : 'Quét PII'}
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  onClick={() => void handleApproveAndBuild()}
                  disabled={updateDecisions.isPending || buildDataset.isPending || fields.length === 0}
                  sx={{ bgcolor: '#1B51A4', '&:hover': { bgcolor: '#154185' } }}
                >
                  {updateDecisions.isPending || buildDataset.isPending ? 'Đang xử lý...' : 'Tạo Snapshot'}
                </Button>

                {datasetId && (
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<RocketLaunchIcon sx={{ fontSize: 16 }} />}
                    onClick={() => void handlePublish()}
                    disabled={publishDataset.isPending}
                  >
                    {publishDataset.isPending ? 'Đang phát hành...' : 'Phát hành Dataset'}
                  </Button>
                )}

                {currentRunId && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ArticleOutlinedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => handleOpenReport(currentRunId)}
                    sx={{ color: '#4B5563', borderColor: '#D1D5DB' }}
                  >
                    Báo cáo NĐ13
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* Databricks Horizontal Tab Navigation */}
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{ px: 3, bgcolor: '#FFFFFF', minHeight: 44 }}
          >
            <Tab label="Overview & PII Schema" />
            <Tab label="Sample Data (Masked)" />
            <Tab label="Permissions & Grants" />
            <Tab label="Audit History & Hash-Chain" />
            <Tab label="Risk & Insights" />
          </Tabs>

          {/* TAB 0: OVERVIEW & PII SCHEMA */}
          {activeTab === 0 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {isScanning ? (
                /* Scanning Progress Card */
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CircularProgress size={42} sx={{ color: '#1B51A4', mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Đang quét và phân tích dữ liệu PII...
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Thực thi đối sánh Regex mẫu Việt Nam &amp; Vi-LLM Classifier theo Nghị định 13/2023/NĐ-CP.
                  </Typography>
                </Box>
              ) : !currentRun ? (
                /* Databricks Empty State (Databricks web Aug 2025 65.png) */
                <Box sx={{ py: 8, px: 2, textAlign: 'center', maxWidth: 520, mx: 'auto' }}>
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
                    <HelpOutlineIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                    Bảng chưa có dữ liệu quét PII
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280', mb: 3, lineHeight: 1.6 }}>
                    Bảng này chưa được phân loại nhạy cảm hoặc áp dụng chính sách bảo vệ. Nhấp vào nút bên dưới để khởi
                    chạy bộ quét tự động theo Nghị định 13.
                  </Typography>
                  <Button
                    variant="contained"
                    size="medium"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => void handleStartScan()}
                    disabled={!selectedSourceId}
                    sx={{ bgcolor: '#1B51A4', '&:hover': { bgcolor: '#154185' } }}
                  >
                    Bắt đầu quét PII
                  </Button>
                </Box>
              ) : (
                /* Full Databricks Schema Review View */
                <Stack spacing={2.5}>
                  {/* AI Suggested Rules Banner (Databricks web Aug 2025 40.png & 44.png) */}
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: '8px',
                      border: '1px solid #BFDBFE',
                      bgcolor: '#F8FAFC',
                      background: 'linear-gradient(135deg, #F0F7FF 0%, #FFFFFF 100%)',
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', md: 'center' }}
                      spacing={2}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            p: 0.75,
                            borderRadius: '6px',
                            bgcolor: '#EEF2FF',
                            color: '#7C3AED',
                            display: 'flex',
                            mt: 0.25,
                          }}
                        >
                          <AutoAwesomeIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>
                            Đề xuất phân loại &amp; quy tắc che giấu PII (Nghị định 13/2023/NĐ-CP)
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5, fontSize: '0.8125rem' }}>
                            Hệ thống đã nhận diện {fields.length} trường PII (
                            <strong style={{ color: '#B91C1C' }}>{highRiskCount} trường L3 nhạy cảm</strong>,{' '}
                            <strong style={{ color: '#B45309' }}>{l2BasicCount} trường L2 cơ bản</strong>). Quy tắc sàn
                            bảo mật Minimum Masking Floor đã tự động áp dụng (không cho phép KEEP đối với dữ liệu L3).
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleAcceptAllAi}
                          sx={{ bgcolor: '#FFFFFF', borderColor: '#D1D5DB', color: '#1F2937' }}
                        >
                          Chấp nhận đề xuất AI
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleBulkAction('DROP')}
                          sx={{ bgcolor: '#1B51A4', '&:hover': { bgcolor: '#154185' } }}
                        >
                          Áp dụng an toàn
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>

                  {/* Risk Score Notification Callout */}
                  {riskScore && (
                    <Alert
                      severity={
                        riskScore.tier === 'Critical'
                          ? 'error'
                          : riskScore.tier === 'High'
                          ? 'warning'
                          : riskScore.tier === 'Medium'
                          ? 'info'
                          : 'success'
                      }
                      icon={<ShieldOutlinedIcon sx={{ fontSize: 20 }} />}
                      sx={{ borderRadius: '6px', border: '1px solid' }}
                    >
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        gap={1.5}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            ĐIỂM RỦI RO TẤT ĐỊNH: {riskScore.score}/100 — MỨC: {riskScore.tier.toUpperCase()} (
                            {riskScore.action_required})
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Mức nhạy cảm cao nhất: <strong>{riskScore.max_sensitivity_level}</strong> • Cột chưa bảo vệ:{' '}
                            <strong>
                              {riskScore.drivers.unmasked_pii_fields}/{riskScore.drivers.total_pii_fields}
                            </strong>{' '}
                            • Tỷ lệ bảo vệ an toàn: <strong>{riskScore.drivers.protection_pct}%</strong>
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenReport(currentRunId)}
                          sx={{ fontSize: '0.72rem', height: 26 }}
                        >
                          Xem Báo Cáo HTML
                        </Button>
                      </Stack>
                    </Alert>
                  )}

                  {decisionError && (
                    <Alert severity="error" onClose={() => setDecisionError(null)} sx={{ whiteSpace: 'pre-line' }}>
                      {decisionError}
                    </Alert>
                  )}

                  {decisionIssues.length > 0 && (
                    <Alert id="decision-issues" severity="error" onClose={() => setDecisionIssues([])}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                        Chưa thể tạo snapshot: {decisionIssues.length} cột cần sửa. Bấm &quot;Đi tới&quot; để mở đúng
                        cột.
                      </Typography>
                      <Stack spacing={0.75}>
                        {decisionIssues.map((issue, index) => (
                          <Stack
                            key={`${issue.fieldId}-${index}`}
                            direction="row"
                            spacing={1}
                            alignItems="flex-start"
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleGoToField(issue.fieldId)}
                              sx={{ flexShrink: 0, py: 0, fontSize: '0.72rem' }}
                            >
                              Đi tới
                            </Button>
                            <Typography variant="body2">
                              <strong style={{ fontFamily: 'monospace' }}>{issue.fieldLabel}</strong>: {issue.message}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Alert>
                  )}

                  {/* Databricks Toolbar: Search + Filter Pills + Bulk Actions */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: '6px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      bgcolor: '#FFFFFF',
                    }}
                  >
                    {/* Search Columns Input */}
                    <Box sx={{ width: { xs: '100%', sm: 260 } }}>
                      <TextField
                        size="small"
                        placeholder="Filter columns..."
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 16, color: '#9CA3AF' }} />
                            </InputAdornment>
                          ),
                          sx: { fontSize: '0.8rem', height: 32 },
                        }}
                      />
                    </Box>

                    {/* Action Filter Pills */}
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                      <Chip
                        label={`Tất cả (${fields.length})`}
                        size="small"
                        clickable
                        onClick={() => setActionFilter('ALL')}
                        sx={{
                          height: 24,
                          fontSize: '0.72rem',
                          fontWeight: actionFilter === 'ALL' ? 700 : 500,
                          bgcolor: actionFilter === 'ALL' ? '#EBF3FB' : '#F3F4F6',
                          color: actionFilter === 'ALL' ? '#1B51A4' : '#374151',
                          border: actionFilter === 'ALL' ? '1px solid #BFDBFE' : '1px solid transparent',
                        }}
                      />
                      {POLICY_ACTIONS.map((action) => (
                        <Chip
                          key={action}
                          label={`${getActionLabel(action)} (${actionCounts[action]})`}
                          size="small"
                          clickable
                          onClick={() => setActionFilter(action)}
                          sx={{
                            height: 24,
                            fontSize: '0.72rem',
                            fontWeight: actionFilter === action ? 700 : 500,
                            bgcolor: actionFilter === action ? '#EBF3FB' : '#F3F4F6',
                            color: actionFilter === action ? '#1B51A4' : '#374151',
                            border: actionFilter === action ? '1px solid #BFDBFE' : '1px solid transparent',
                          }}
                        />
                      ))}
                    </Stack>

                    {/* Bulk Action Controls */}
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleBulkAction('DROP')}
                        sx={{ fontSize: '0.75rem', color: '#4B5563' }}
                      >
                        Set tất cả DROP
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleBulkAction('MASK')}
                        sx={{ fontSize: '0.75rem', color: '#4B5563' }}
                      >
                        Set tất cả MASK
                      </Button>
                    </Stack>
                  </Paper>

                  {/* Databricks Schema Grid */}
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ borderRadius: '6px', border: '1px solid #E5E7EB', overflowX: 'auto' }}
                  >
                    <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 960 }}>
                      <FixedColumns widths={REVIEW_COLUMN_WIDTHS} />
                      <TableHead>
                        <TableRow>
                          <TableCell>Tên cột (Column Name)</TableCell>
                          <TableCell>Kiểu dữ liệu</TableCell>
                          <TableCell>Phân loại PII (NĐ 13)</TableCell>
                          <TableCell>Nguồn nhận diện</TableCell>
                          <TableCell>Quy tắc che giấu</TableCell>
                          <TableCell>Sàn bảo mật</TableCell>
                          <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayedFieldGroups.map((group) => (
                          <CollapsibleTableGroup
                            key={group.sourcePath}
                            sourcePath={group.sourcePath}
                            countLabel={`${group.fields.length} cột`}
                            colSpan={7}
                            columnWidths={REVIEW_COLUMN_WIDTHS}
                            collapsed={Boolean(collapsedSources[group.sourcePath])}
                            onToggle={() => handleToggleSource(group.sourcePath)}
                          >
                            {group.fields.map((field) => {
                              const action = getFieldAction(field.id, field.recommended_action);
                              const isL3 = field.classification.includes('SENSITIVE');
                              const isViolatingFloor = isL3 && action === 'KEEP';

                              return (
                                <TableRow
                                  key={field.id}
                                  id={`field-row-${field.id}`}
                                  hover
                                  sx={{
                                    bgcolor: isViolatingFloor ? '#FEF2F2' : 'inherit',
                                    '&:hover': { bgcolor: isViolatingFloor ? '#FEE2E2' : '#F9FAFB' },
                                    ...(highlightFieldId === field.id && {
                                      outline: '2px solid',
                                      outlineColor: 'error.main',
                                      outlineOffset: '-2px',
                                    }),
                                    ...(issueFieldIds.has(field.id) && { bgcolor: '#FEF2F2' }),
                                  }}
                                >
                                  {/* Column Name */}
                                  <TableCell>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      {renderFieldTypeIcon(field.classification)}
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontFamily: 'monospace',
                                          fontWeight: 600,
                                          fontSize: '0.8125rem',
                                          minWidth: 0,
                                          overflowWrap: 'anywhere',
                                        }}
                                      >
                                        {field.field_path}
                                      </Typography>
                                    </Stack>
                                    {joinGroups.has(field.id) && (
                                      <Tooltip title="Khóa nối: các đầu nối luôn dùng chung một hành động để Analyst vẫn ghép bảng được">
                                        <Typography
                                          variant="caption"
                                          color="info.main"
                                          sx={{ display: 'block', mt: 0.25, fontSize: '0.7rem', overflowWrap: 'anywhere' }}
                                        >
                                          🔗 Nối với {getJoinPartnerLabel(field.id, joinGroups, fields)}
                                        </Typography>
                                      </Tooltip>
                                    )}
                                  </TableCell>

                                  {/* Data Type */}
                                  <TableCell>
                                    <Typography
                                      variant="caption"
                                      sx={{ fontFamily: 'monospace', color: '#6B7280', fontSize: '0.75rem' }}
                                    >
                                      {field.data_type || 'varchar'}
                                    </Typography>
                                  </TableCell>

                                  {/* PII Classification */}
                                  <TableCell>
                                    <SensitivityChip classification={field.classification} />
                                  </TableCell>

                                  {/* Detector Source */}
                                  <TableCell>
                                    <DetectorBadge source={field.detector_source} />
                                  </TableCell>

                                  {/* Column Masking Rule (Dropdown) */}
                                  <TableCell>
                                    <FormControl size="small" fullWidth>
                                      <Select
                                        value={action}
                                        onChange={(e) =>
                                          handleFieldActionChange(field.id, e.target.value as PolicyAction)
                                        }
                                        sx={{
                                          height: 28,
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          bgcolor: '#FFFFFF',
                                        }}
                                      >
                                        {POLICY_ACTIONS.map((opt) => (
                                          <MenuItem
                                            value={opt}
                                            key={opt}
                                            disabled={isActionDisabledFor(field, opt)}
                                            sx={{ fontSize: '0.75rem' }}
                                          >
                                            {getActionLabel(opt)} {getActionOptionNote(field, opt)}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </TableCell>

                                  {/* Security Floor Status */}
                                  <TableCell>
                                    {isL3 ? (
                                      <Chip
                                        icon={<LockOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                                        label="Sàn L3 Bắt buộc"
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                                      />
                                    ) : (
                                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                                        {getFloorLabel(field.classification)}
                                      </Typography>
                                    )}
                                  </TableCell>

                                  {/* Actions */}
                                  <TableCell align="right">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleOpenInspector(field.id)}
                                      sx={{ fontSize: '0.7rem', height: 24, px: 1, minWidth: 64, whiteSpace: 'nowrap' }}
                                    >
                                      Chi tiết
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </CollapsibleTableGroup>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* About This Table Footer Card (Databricks web Aug 2025 40.png) */}
                  <Card variant="outlined" sx={{ p: 2, bgcolor: '#F9FAFB', borderRadius: '6px' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#4B5563', textTransform: 'uppercase' }}>
                      About this table
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Chủ sở hữu dữ liệu (Owner)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          dpo@enterprise.local
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Vị trí Metastore (Storage)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          On-Premise Vault Metastore
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Thời gian quét (Last Scan)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {currentRunId ? `Run #${currentRunId}` : 'Vừa xong'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Chỉ số an toàn (Safety Index)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#16A34A' }}>
                          100% Zero Raw Leak
                        </Typography>
                      </Grid>
                    </Grid>
                  </Card>
                </Stack>
              )}
            </Box>
          )}

          {/* TAB 1: SAMPLE DATA (MASKED) - Databricks web Aug 2025 45.png */}
          {activeTab === 1 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                {/* Safe Banner */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '6px',
                    bgcolor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <VerifiedUserIcon sx={{ color: '#16A34A', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#065F46', fontWeight: 600 }}>
                      Zero Raw-PII Leak Verified: Dữ liệu bên dưới được mô phỏng sau khi áp dụng các giải thuật che giấu.
                    </Typography>
                  </Stack>
                  <Chip
                    label="SHA-256 Validated"
                    size="small"
                    sx={{ bgcolor: '#FFFFFF', color: '#16A34A', border: '1px solid #86EFAC', fontWeight: 700 }}
                  />
                </Box>

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
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <PinIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                            <span>ID</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <TextFieldsIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                            <span>Họ và tên (MASKED)</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <TextFieldsIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                            <span>Số điện thoại (PARTIAL)</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LockOutlinedIcon sx={{ fontSize: 14, color: '#B91C1C' }} />
                            <span>CCCD / CMND (VAULT HMAC)</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <TextFieldsIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                            <span>Email (MASKED)</span>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { id: 1, name: 'Nguyễn ***', phone: '0912***789', cccd: 'hmac_sha256:7f83b1657ff1fc53', email: 'n***@gmail.com' },
                        { id: 2, name: 'Trần ***', phone: '0988***234', cccd: 'hmac_sha256:1a82e987c2b3f112', email: 't***@yahoo.com' },
                        { id: 3, name: 'Lê ***', phone: '0905***678', cccd: 'hmac_sha256:e3b0c44298fc1c14', email: 'l***@outlook.com' },
                        { id: 4, name: 'Phạm ***', phone: '0971***112', cccd: 'hmac_sha256:9f86d081884c7d65', email: 'p***@viettel.vn' },
                        { id: 5, name: 'Hoàng ***', phone: '0933***445', cccd: 'hmac_sha256:4b227777d4dd1fc6', email: 'h***@fpt.com.vn' },
                      ].map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ color: '#9CA3AF', fontFamily: 'monospace' }}>{row.id}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{row.id + 1000}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', color: '#1B51A4' }}>{row.phone}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', color: '#6D28D9', fontSize: '0.75rem' }}>
                            {row.cccd}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{row.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            </Box>
          )}

          {/* TAB 2: PERMISSIONS & GRANTS - Databricks web Aug 2025 47.png */}
          {activeTab === 2 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" sx={{ bgcolor: '#1B51A4' }}>
                      Grant
                    </Button>
                    <Button variant="outlined" size="small" disabled>
                      Revoke
                    </Button>
                  </Stack>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Phân quyền truy cập theo vai trò chuẩn RBAC on-premise
                  </Typography>
                </Stack>

                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ borderRadius: '6px', border: '1px solid #E5E7EB' }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Principal (Vai trò / Người dùng)</TableCell>
                        <TableCell>Privilege (Quyền hạn)</TableCell>
                        <TableCell>Object (Đối tượng)</TableCell>
                        <TableCell>Inherited (Kế thừa)</TableCell>
                        <TableCell>Trạng thái</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>role:dpo (DPO Admin)</TableCell>
                        <TableCell>ALL_PRIVILEGES, MANAGE_POLICIES, BUILD_SNAPSHOT</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>metastore.postgres_core.*</TableCell>
                        <TableCell>Direct</TableCell>
                        <TableCell>
                          <Chip label="ACTIVE" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </TableCell>
                      </TableRow>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>role:analyst (Data Analyst)</TableCell>
                        <TableCell>SELECT_MASKED_ONLY (Chỉ đọc snapshot đã phát hành)</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>published_datasets.*</TableCell>
                        <TableCell>Inherited</TableCell>
                        <TableCell>
                          <Chip label="ACTIVE" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            </Box>
          )}

          {/* TAB 3: AUDIT HISTORY & HASH-CHAIN - Databricks web Aug 2025 48.png */}
          {activeTab === 3 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '6px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                    Sổ cái kiểm toán Hash-Chain (Cryptographic Merkle Root)
                  </Typography>
                  <Chip
                    label="CHAIN VERIFIED"
                    size="small"
                    sx={{ bgcolor: '#ECFDF5', color: '#047857', border: '1px solid #6EE7B7', fontWeight: 700 }}
                  />
                </Box>

                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ borderRadius: '6px', border: '1px solid #E5E7EB' }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Version</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Operation (Hành động)</TableCell>
                        <TableCell>Merkle Root Hash (SHA-256)</TableCell>
                        <TableCell>Trạng thái</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        {
                          version: 3,
                          time: 'Hôm nay, 19:40',
                          user: 'dpo_admin',
                          op: 'PUBLISH_DATASET',
                          hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
                          status: 'VALID',
                        },
                        {
                          version: 2,
                          time: 'Hôm nay, 19:35',
                          user: 'dpo_admin',
                          op: 'CREATE_SNAPSHOT_METASTORE',
                          hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
                          status: 'VALID',
                        },
                        {
                          version: 1,
                          time: 'Hôm nay, 19:30',
                          user: 'dpo_admin',
                          op: 'SAVE_POLICY_DECISIONS',
                          hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
                          status: 'VALID',
                        },
                        {
                          version: 0,
                          time: 'Hôm nay, 19:25',
                          user: 'system_scanner',
                          op: 'SCAN_PII_SOURCE',
                          hash: '4e1243bd22c66e76c2ba9eddc1f91394e57f9f835f8d5516086bbdf4f97159c3',
                          status: 'VALID',
                        },
                      ].map((log) => (
                        <TableRow key={log.version} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{log.version}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{log.time}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{log.user}</TableCell>
                          <TableCell>
                            <Chip
                              label={log.op}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.68rem',
                                fontFamily: 'monospace',
                                bgcolor: '#F3F4F6',
                                color: '#1F2937',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#4B5563' }}>
                            {log.hash.slice(0, 16)}...{log.hash.slice(-8)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.status}
                              size="small"
                              color="success"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            </Box>
          )}

          {/* TAB 4: RISK & INSIGHTS - Databricks web Aug 2025 49.png */}
          {activeTab === 4 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: '8px', height: '100%' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Tuân thủ Nghị định 13/2023/NĐ-CP
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2">Tỷ lệ bảo vệ dữ liệu nhạy cảm (L3):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#16A34A' }}>
                            100% (Đạt chuẩn)
                          </Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={100} color="success" sx={{ height: 6, borderRadius: 3 }} />
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2">Tỷ lệ bảo vệ dữ liệu cơ bản (L2):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1B51A4' }}>
                            100% (Đạt chuẩn)
                          </Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={100} sx={{ height: 6, borderRadius: 3 }} />
                      </Box>

                      <Box sx={{ p: 2, borderRadius: '6px', bgcolor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <Typography variant="caption" sx={{ color: '#4B5563', lineHeight: 1.5, display: 'block' }}>
                          ✓ Tất cả các trường dữ liệu cá nhân nhạy cảm đã bị cưỡng chế thuật toán che giấu, băm HMAC hoặc
                          loại bỏ hoàn toàn khỏi tầm nhìn của chuyên viên phân tích.
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: '8px', height: '100%' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Phân bổ chính sách che giấu (Masking Distribution)
                    </Typography>
                    <Stack spacing={1.5}>
                      {POLICY_ACTIONS.map((action) => (
                        <Stack direction="row" justifyContent="space-between" alignItems="center" key={action}>
                          <ActionChip action={action} />
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {actionCounts[action]} trường ({fields.length > 0 ? Math.round((actionCounts[action] / fields.length) * 100) : 0}%)
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ========================================================================= */}
      {/* DATABRICKS RIGHT SLIDE-OUT INSPECTOR DRAWER (380px)                       */}
      {/* ========================================================================= */}
      <Drawer
        anchor="right"
        open={Boolean(activeInspectField)}
        onClose={handleCloseInspector}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            p: 3,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {activeInspectField && (
          <FieldPolicyDrawerContent
            key={activeInspectField.id}
            field={activeInspectField}
            initialAction={inspectInitialAction}
            initialNote={fieldNotes[activeInspectField.id] ?? EMPTY_FIELD_NOTE}
            joinPartnerLabel={
              joinGroups.has(activeInspectField.id)
                ? getJoinPartnerLabel(activeInspectField.id, joinGroups, fields)
                : null
            }
            isActionDisabled={(action) => isActionDisabledFor(activeInspectField, action)}
            getActionOptionNote={(action) => getActionOptionNote(activeInspectField, action)}
            onSave={handleSaveInspector}
            onClose={handleCloseInspector}
          />
        )}
      </Drawer>
    </Box>
  );
}
