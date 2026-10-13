import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import PinIcon from '@mui/icons-material/Pin';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { AuditTrail } from '@/features/auditLog';
import { DatasetGrantsPanel, DatasetPreviewTable } from '@/features/datasets';
import { RunStatusBadge } from '@/features/runHistory';
import { ApiError } from '@/shared/api/client';
import { STICKY_PANEL_HEIGHT, STICKY_PANEL_TOP } from '@/shared/config/layout';
import { routes } from '@/shared/config/routes';
import { getStoredSession } from '@/features/auth/model/authStorage';
import { AddSourceDialog } from './AddSourceDialog';
import { CollapsibleTableGroup, FixedColumns } from './CollapsibleTableGroup';
import { FieldPolicyDrawerContent } from './FieldPolicyDrawerContent';
import { ActionChip, SensitivityChip, DetectorBadge } from './PolicyChips';
import {
  POLICY_ACTIONS,
  type PolicyAction,
  getActionLabel,
} from '../model/policyLabels';
import { isUserSource } from '../model/sourceForm';
import { computeProtectionRates } from '../model/protectionRates';
import { getLatestDataset, restoreSavedDecisions } from '../model/savedDecisions';
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
type DpoReviewExperienceProps = {
  /** Run to reopen (from `/dpo/runs/:id`); null starts a fresh review. */
  initialRunId?: number | null;
  /** Called after a scan creates a run, so the page can put it in the URL. */
  onRunCreated?: (runId: number) => void;
};

/** Snapshot statuses that still have rows to preview and grants to manage. */
const LIVE_DATASET_STATUSES = new Set(['VERIFIED', 'PUBLISHED']);

const RISK_TIER_LABELS: Record<'Critical' | 'High' | 'Medium' | 'Low', string> = {
  Critical: 'Nghiêm trọng',
  High: 'Cao',
  Medium: 'Trung bình',
  Low: 'Thấp',
};

export function DpoReviewExperienceMVP({ initialRunId = null, onRunCreated }: DpoReviewExperienceProps): JSX.Element {
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
  const [collapsedSources, setCollapsedSources] = useState<Record<string, boolean>>({});
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  // While a run is open the review table needs the width; the source list folds into a rail.
  const [catalogCollapsed, setCatalogCollapsed] = useState(initialRunId !== null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Inspector Drawer state
  const [inspectFieldId, setInspectFieldId] = useState<number | null>(null);
  const [fieldNotes, setFieldNotes] = useState<Record<number, FieldDecisionNote>>({});
  const [inspectInitialAction, setInspectInitialAction] = useState<PolicyAction>('MASK');
  const [decisionIssues, setDecisionIssues] = useState<DecisionIssue[]>([]);
  const [highlightFieldId, setHighlightFieldId] = useState<number | null>(null);
  const issueFieldIds = useMemo(() => new Set(decisionIssues.map((issue) => issue.fieldId)), [decisionIssues]);

  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useDataSources();
  const { data: sourceScope } = useSourceScope(selectedSourceId);
  const { data: currentRun } = useRun(currentRunId);
  const { data: riskScore } = useRiskScore(currentRunId);

  const createScan = useCreateScanRun();
  const deleteSource = useDeleteDataSource();
  const updateDecisions = useUpdateFieldDecisions(currentRunId || 0);
  const buildDataset = useBuildDataset(currentRunId || 0);
  const publishDataset = usePublishDataset();

  // The URL decides which run is open: /dpo starts fresh, /dpo/runs/:id reopens a saved run.
  const hydratedRunId = useRef<number | null>(null);
  useEffect(() => {
    hydratedRunId.current = null;
    setCurrentRunId(initialRunId);
    setDatasetId(null);
    setDecisionOverrides({});
    setFieldNotes({});
    setDecisionIssues([]);
    setActiveTab(0);
    setCatalogCollapsed(initialRunId !== null);
  }, [initialRunId]);

  // Once per opened run, restore its source, latest snapshot and the decisions already saved.
  useEffect(() => {
    if (!currentRun || hydratedRunId.current === currentRun.id) return;
    hydratedRunId.current = currentRun.id;
    setSelectedSourceId(currentRun.source_id);
    setDatasetId(getLatestDataset(currentRun.datasets)?.id ?? null);
    const restored = restoreSavedDecisions(currentRun.field_decisions);
    setDecisionOverrides(restored.overrides);
    setFieldNotes(restored.notes);
  }, [currentRun]);

  const datasetStatus = currentRun?.datasets.find((dataset) => dataset.id === datasetId)?.status ?? null;
  const datasetIsLive = datasetStatus !== null && LIVE_DATASET_STATUSES.has(datasetStatus);

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

  const protectionRates = useMemo(
    () => computeProtectionRates(fields, (field) => getFieldAction(field.id, field.recommended_action)),
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

  const handleStartScan = async () => {
    if (!selectedSourceId || selectedScope.length === 0) return;

    setIsScanning(true);
    setDecisionOverrides({});
    setFieldNotes({});
    setDecisionIssues([]);
    setActionFilter('ALL');
    setDecisionError(null);

    try {
      const run = await createScan.mutateAsync({
        sourceId: selectedSourceId,
        selectedScope,
      });
      setCurrentRunId(run.id);
      setActiveTab(0);
      onRunCreated?.(run.id);
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
      alert(`Đã tạo snapshot thành công! Mã dataset: ${result.dataset.id}`);
    } catch (error) {
      console.error('Build failed:', error);
      const serverIssues = error instanceof ApiError ? issuesFromApiError(error.response, fields) : [];
      if (serverIssues.length > 0) {
        showDecisionIssues(serverIssues);
        return;
      }
      const msg = getDecisionErrorMessage(error);
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
      {/* One panel that animates its width; collapsed it keeps only a rail of icons. */}
      <Box
        component="aside"
        aria-label="Nguồn dữ liệu"
        sx={(theme) => ({
          width: catalogCollapsed ? 48 : 270,
          flexShrink: 0,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          height: STICKY_PANEL_HEIGHT,
          position: 'sticky',
          top: STICKY_PANEL_TOP,
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        })}
      >
        {catalogCollapsed ? (
          <Stack alignItems="center" spacing={1} sx={{ py: 1 }}>
            <Tooltip title="Mở danh sách nguồn" placement="right">
              <IconButton size="small" onClick={() => setCatalogCollapsed(false)} aria-label="Mở danh sách nguồn">
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={activeSource ? `Nguồn: ${activeSource.name}` : 'Chưa chọn nguồn'} placement="right">
              <StorageOutlinedIcon fontSize="small" color={activeSource ? 'primary' : 'disabled'} />
            </Tooltip>
          </Stack>
        ) : (
        <Box sx={{ minWidth: 268, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Catalog Explorer Header */}
        <Box sx={{ p: 1.5, borderBottom: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
              Nguồn dữ liệu
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Làm mới">
                <IconButton size="small" onClick={() => void refetchSources()} sx={{ color: '#6B7280' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Thu gọn">
                <IconButton size="small" onClick={() => setCatalogCollapsed(true)} aria-label="Thu gọn danh sách nguồn">
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

        </Box>

        {/* Tree Search Box */}
        <Box sx={{ p: 1, borderBottom: '1px solid #E5E7EB' }}>
          <TextField
            size="small"
            placeholder="Tìm nguồn dữ liệu..."
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
        )}
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
              Nguồn dữ liệu &gt; {activeSource?.name ?? 'Chưa chọn nguồn'}
              {displayedFieldGroups[0] ? (
                <>
                  {' '}&gt; <strong>{displayedFieldGroups[0].sourcePath}</strong>
                </>
              ) : null}
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
                      {currentRun ? `Run #${currentRun.id}` : activeSource?.name ?? 'Chọn nguồn dữ liệu'}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    {currentRun ? (
                      <RunStatusBadge status={currentRun.status} />
                    ) : (
                      <Chip label="Chưa quét" size="small" variant="outlined" />
                    )}
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      Nguồn: {activeSource ? `${activeSource.name} (${activeSource.engine})` : '—'}
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

                {datasetId && datasetStatus === 'VERIFIED' && (
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

                {datasetId && (
                  <Button component={RouterLink} to={routes.dpoDataset(datasetId)} size="small" variant="outlined">
                    Quản lý dataset #{datasetId}
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
                    Báo cáo tuân thủ
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* Databricks Horizontal Tab Navigation */}
          <Tabs
            value={activeTab}
            onChange={(_, val: number) => setActiveTab(val)}
            sx={{ px: 3, bgcolor: '#FFFFFF', minHeight: 44 }}
          >
            <Tab label="Tổng quan & phân loại PII" />
            <Tab label="Dữ liệu đã bảo vệ" />
            <Tab label="Quyền truy cập" />
            <Tab label="Nhật ký kiểm toán" />
            <Tab label="Rủi ro" />
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
                    Đối sánh mẫu nhận diện tiếng Việt và phân loại bằng AI theo Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP.
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
                    chạy bộ quét tự động theo Luật 91/2025/QH15.
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
                            Đề xuất phân loại &amp; quy tắc che giấu PII (Luật 91/2025/QH15)
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5, fontSize: '0.8125rem' }}>
                            Hệ thống đã nhận diện {fields.length} trường PII (
                            <strong style={{ color: '#B91C1C' }}>{highRiskCount} trường L3 nhạy cảm</strong>,{' '}
                            <strong style={{ color: '#B45309' }}>{l2BasicCount} trường L2 cơ bản</strong>). Quy tắc mức
                            che tối thiểu đã tự động áp dụng (không cho phép KEEP đối với dữ liệu L3).
                          </Typography>
                        </Box>
                      </Stack>

                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleAcceptAllAi}
                        sx={{ flexShrink: 0, bgcolor: '#FFFFFF', borderColor: '#D1D5DB', color: '#1F2937' }}
                      >
                        Chấp nhận đề xuất AI
                      </Button>
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
                            ĐIỂM RỦI RO: {riskScore.score}/100 — MỨC: {RISK_TIER_LABELS[riskScore.tier].toUpperCase()} (
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
                        placeholder="Lọc cột..."
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
                        Loại bỏ tất cả
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleBulkAction('MASK')}
                        sx={{ fontSize: '0.75rem', color: '#4B5563' }}
                      >
                        Che tất cả
                      </Button>
                    </Stack>
                  </Paper>

                  {/* Databricks Schema Grid */}
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ borderRadius: '6px', border: '1px solid #E5E7EB', overflowX: 'auto' }}
                  >
                    <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 880 }}>
                      <FixedColumns widths={REVIEW_COLUMN_WIDTHS} />
                      <TableHead>
                        <TableRow>
                          <TableCell>Tên cột (Column Name)</TableCell>
                          <TableCell>Kiểu dữ liệu</TableCell>
                          <TableCell>Phân loại PII</TableCell>
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

                </Stack>
              )}
            </Box>
          )}

          {/* TAB 1: rows read back from the protected snapshot */}
          {activeTab === 1 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {datasetId ? (
                <DatasetPreviewTable datasetId={datasetId} available={datasetIsLive} />
              ) : (
                <Alert severity="info">
                  Chưa có snapshot cho lượt quét này. Bấm “Tạo Snapshot” để xem dữ liệu sau khi áp dụng MASK / HMAC /
                  DROP.
                </Alert>
              )}
            </Box>
          )}

          {/* TAB 2: dataset grants */}
          {activeTab === 2 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {datasetId ? (
                <DatasetGrantsPanel datasetId={datasetId} editable={datasetIsLive} />
              ) : (
                <Alert severity="info">
                  Quyền truy cập được cấp trên từng dataset. Tạo snapshot trước để quản lý quyền của Analyst.
                </Alert>
              )}
            </Box>
          )}

          {/* TAB 3: audit events of this run + hash-chain check */}
          {activeTab === 3 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {currentRunId ? (
                <AuditTrail entityType="run" entityId={currentRunId} />
              ) : (
                <Alert severity="info">Chưa có lượt quét nào được mở.</Alert>
              )}
            </Box>
          )}

          {/* TAB 4: RISK & INSIGHTS - Databricks web Aug 2025 49.png */}
          {activeTab === 4 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: '8px', height: '100%' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Mức bảo vệ theo quyết định hiện tại
                    </Typography>
                    <Stack spacing={2}>
                      {[
                        { label: 'Dữ liệu nhạy cảm (L3)', rate: protectionRates.sensitive },
                        { label: 'Dữ liệu cơ bản (L2)', rate: protectionRates.basic },
                      ].map(({ label, rate }) => (
                        <Box key={label}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="body2">{label}:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {rate.percent === null
                                ? 'Không có cột'
                                : `${rate.percent}% (${rate.protectedCount}/${rate.total} cột)`}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={rate.percent ?? 100}
                            color={rate.percent === null || rate.percent === 100 ? 'success' : 'warning'}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      ))}
                      <Typography variant="caption" color="text.secondary">
                        Cột được tính là đã bảo vệ khi được MASK, HMAC hoặc DROP. Cột cá nhân giữ nguyên (KEEP) chỉ được
                        phép dưới dạng ngoại lệ có thời hạn.
                        {riskScore?.row_count_estimated
                          ? ' Điểm rủi ro dùng số dòng ước lượng vì không đếm được nguồn.'
                          : ''}
                      </Typography>
                    </Stack>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: '8px', height: '100%' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Phân bổ chính sách che giấu
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
