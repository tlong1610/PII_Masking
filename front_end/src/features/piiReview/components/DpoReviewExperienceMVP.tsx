import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { DETAIL_DRAWER_WIDTH } from '@/shared/config/layout';

import { AuditTrail } from '@/features/auditLog';
import { ApiError } from '@/shared/api/client';
import { fetchRunReportHtml } from '../api/realPiiReviewApi';
import { routes } from '@/shared/config/routes';
import { ConfirmDialog, MascotLoader, StateNotice, useNotify } from '@/shared/ui';
import {
  useBuildDataset,
  useCreateScanRun,
  useDataSources,
  useDeleteDataSource,
  useJoinKeys,
  usePublishDataset,
  useRevokeDataset,
  useRiskScore,
  useRun,
  useSourceScope,
  useUpdateFieldDecisions,
} from '../hooks/usePiiReview';
import { useStableCallback } from '../hooks/useStableCallback';
import { suggestDatasetName } from '../model/datasetName';
import { type DecisionIssue, collectDecisionIssues, issuesFromApiError } from '../model/decisionIssues';
import {
  EMPTY_FIELD_NOTE,
  type FieldDecisionNote,
  buildFieldDecisionPayload,
  getFieldKind,
  needsException,
  needsNotPersonalConfirmation,
} from '../model/fieldDecision';
import { JOIN_KEY_ACTIONS, buildJoinGroups, formatJoinKeyViolations, getJoinPartnerLabel } from '../model/joinKeys';
import type { PolicyAction } from '../model/policyLabels';
import { getFieldStats } from '../model/fieldStats';
import { computeProtectionRates } from '../model/protectionRates';
import { type ReviewAction, countPendingChanges, getReviewActions } from '../model/reviewActions';
import { getLatestDataset, restoreSavedDecisions } from '../model/savedDecisions';
import { analyzeScopeLinks, effectiveLinkScope } from '../model/scopeLinks';
import { AddSourceDialog } from './AddSourceDialog';
import { DatasetNameDialog } from './DatasetNameDialog';
import { DecisionNotices } from './DecisionNotices';
import { FieldPolicyDrawerContent } from './FieldPolicyDrawerContent';
import { FieldReviewTable } from './FieldReviewTable';
import { ReviewToolbar, type ActionFilter } from './ReviewToolbar';
import { RiskInsightsTab } from './RiskInsightsTab';
import { RunHeader } from './RunHeader';
import { RunKpiCards } from './RunKpiCards';
import { ScopeSelectionStep } from './ScopeSelectionStep';
import { SnapshotTab } from './SnapshotTab';
import { SourcePicker } from './SourcePicker';

const TAB = { REVIEW: 0, RISK: 1, AUDIT: 2, SNAPSHOT: 3 } as const;

type BusyPhase = 'scanning' | 'saving' | 'building' | 'publishing' | 'revoking';
const BUSY_LABELS: Record<BusyPhase, string> = {
  scanning: 'Đang quét…',
  saving: 'Đang lưu…',
  building: 'Đang kiểm định…',
  publishing: 'Đang phát hành…',
  revoking: 'Đang thu hồi…',
};

type PendingConfirm = { kind: 'PUBLISH' } | { kind: 'REVOKE' } | { kind: 'FORCE_DELETE_SOURCE'; sourceId: string };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return formatJoinKeyViolations(error.response) ?? error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

type DpoReviewExperienceProps = {
  /** Run to reopen (from `/dpo/runs/:id`); null starts a fresh review. */
  initialRunId?: number | null;
  /** Called after a scan creates a run, so the page can put it in the URL. */
  onRunCreated?: (runId: number) => void;
};

export function DpoReviewExperienceMVP({ initialRunId = null, onRunCreated }: DpoReviewExperienceProps): JSX.Element {
  const navigate = useNavigate();
  const notify = useNotify();

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<string[]>([]);
  const [linkScope, setLinkScope] = useState<string[]>([]);
  const [currentRunId, setCurrentRunId] = useState<number | null>(initialRunId);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number>(TAB.REVIEW);
  const [columnSearch, setColumnSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [decisionOverrides, setDecisionOverrides] = useState<Record<number, PolicyAction>>({});
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [collapsedSources, setCollapsedSources] = useState<Record<string, boolean>>({});
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [busyPhase, setBusyPhase] = useState<BusyPhase | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  // Inspector Drawer state
  const [inspectFieldId, setInspectFieldId] = useState<number | null>(null);
  const [fieldNotes, setFieldNotes] = useState<Record<number, FieldDecisionNote>>({});
  const [inspectInitialAction, setInspectInitialAction] = useState<PolicyAction>('MASK');
  const [decisionIssues, setDecisionIssues] = useState<DecisionIssue[]>([]);
  const [highlightFieldId, setHighlightFieldId] = useState<number | null>(null);
  const issueFieldIds = useMemo(() => new Set(decisionIssues.map((issue) => issue.fieldId)), [decisionIssues]);

  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useDataSources();
  const { data: currentRun } = useRun(currentRunId);
  // The table list is only needed to pick a scope before scanning, not while a run is open.
  const {
    data: sourceScope,
    isError: scopeFailed,
    error: scopeError,
    refetch: refetchScope,
    isFetching: scopeFetching,
  } = useSourceScope(currentRunId === null ? selectedSourceId : null);
  // Run created by the scan button: the URL change that follows must not reset the screen.
  const justCreatedRunId = useRef<number | null>(null);
  const { data: riskScore } = useRiskScore(currentRunId);

  const createScan = useCreateScanRun();
  const deleteSource = useDeleteDataSource();
  const updateDecisions = useUpdateFieldDecisions(currentRunId || 0);
  const buildDataset = useBuildDataset(currentRunId || 0);
  const publishDataset = usePublishDataset();
  const revokeDataset = useRevokeDataset();

  const resetReview = (): void => {
    setDecisionOverrides({});
    setFieldNotes({});
    setDecisionIssues([]);
    setDecisionError(null);
    setActionFilter('ALL');
  };

  // The URL decides which run is open: /dpo starts fresh, /dpo/runs/:id reopens a saved run.
  const hydratedRunId = useRef<number | null>(null);
  useEffect(() => {
    if (initialRunId !== null && initialRunId === justCreatedRunId.current) {
      justCreatedRunId.current = null;
      return;
    }
    hydratedRunId.current = null;
    setCurrentRunId(initialRunId);
    setDatasetId(null);
    resetReview();
    setActiveTab(TAB.REVIEW);
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

  // Before a scan, pick the first source when none is selected yet. An open run already names its
  // source; picking here too would race the restore above and show the wrong one.
  useEffect(() => {
    if (currentRunId === null && !selectedSourceId && sources?.[0]) setSelectedSourceId(sources[0].id);
  }, [currentRunId, selectedSourceId, sources]);

  const datasetStatus = currentRun?.datasets.find((dataset) => dataset.id === datasetId)?.status ?? null;
  const fields = useMemo(() => currentRun?.field_profiles ?? [], [currentRun?.field_profiles]);
  const { data: joinKeys } = useJoinKeys(currentRunId);
  const joinGroups = useMemo(() => buildJoinGroups(fields, joinKeys ?? []), [fields, joinKeys]);

  const getFieldAction = useCallback(
    (field: { id: number; recommended_action: PolicyAction }): PolicyAction =>
      decisionOverrides[field.id] ?? field.recommended_action,
    [decisionOverrides],
  );

  const pendingChanges = useMemo(
    () => (currentRun ? countPendingChanges(fields, getFieldAction, currentRun.field_decisions) : 0),
    [currentRun, fields, getFieldAction],
  );
  const reviewActions = getReviewActions({
    runStatus: currentRun?.status ?? null,
    datasetStatus,
    hasPendingChanges: pendingChanges > 0,
  });
  const editable = reviewActions.editable && busyPhase === null;

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

  const getActionOptionNote = useCallback(
    (field: { id: number; classification: string }, action: PolicyAction): string => {
      if (getFieldKind(field.classification) === 'SENSITIVE' && action === 'KEEP') return 'Cấm với L3';
      if (joinGroups.has(field.id) && isActionDisabledFor(field, action)) return 'Khóa nối';
      return '';
    },
    [isActionDisabledFor, joinGroups],
  );

  const getJoinLabel = (fieldId: number): string | null =>
    joinGroups.has(fieldId) ? getJoinPartnerLabel(fieldId, joinGroups, fields) : null;

  /** Applies one action to a field and, for join keys, to every other end of the join. */
  const applyActionToGroup = useCallback(
    (fieldId: number, action: PolicyAction) => {
      const ids = joinGroups.get(fieldId) ?? [fieldId];
      setDecisionOverrides((current) => ids.reduce((next, id) => ({ ...next, [id]: action }), current));
    },
    [joinGroups],
  );

  const actionCounts = useMemo(
    () =>
      fields.reduce<Record<PolicyAction, number>>(
        (counts, field) => {
          const action = getFieldAction(field);
          return { ...counts, [action]: counts[action] + 1 };
        },
        { MASK: 0, REDACT: 0, HMAC: 0, DROP: 0, KEEP: 0 },
      ),
    [fields, getFieldAction],
  );

  const protectionRates = useMemo(() => computeProtectionRates(fields, getFieldAction), [fields, getFieldAction]);
  const fieldStats = useMemo(() => getFieldStats(fields, getFieldAction), [fields, getFieldAction]);

  const filteredFields = useMemo(() => {
    const term = columnSearch.trim().toLowerCase();
    return fields.filter(
      (field) =>
        (actionFilter === 'ALL' || getFieldAction(field) === actionFilter) &&
        (term === '' || field.field_path.toLowerCase().includes(term) || field.source_path.toLowerCase().includes(term)),
    );
  }, [actionFilter, columnSearch, fields, getFieldAction]);

  const fieldGroups = useMemo(() => {
    const grouped = new Map<string, typeof filteredFields>();
    filteredFields.forEach((field) => grouped.set(field.source_path, [...(grouped.get(field.source_path) ?? []), field]));
    return Array.from(grouped, ([sourcePath, groupFields]) => ({ sourcePath, fields: groupFields }));
  }, [filteredFields]);

  const scopeLabel = useMemo(() => {
    const tables = Array.from(new Set(fields.map((field) => field.source_path)));
    if (tables.length === 0) return null;
    return tables.length > 3 ? `${tables.slice(0, 3).join(', ')} +${tables.length - 3}` : tables.join(', ');
  }, [fields]);

  const suggestedDatasetName = useMemo(
    () =>
      currentRun
        ? suggestDatasetName(
            getLatestDataset(currentRun.datasets)?.dataset_name,
            currentRun.source_name,
            Array.from(new Set(fields.map((field) => field.source_path))),
          )
        : '',
    [currentRun, fields],
  );

  const activeInspectField = useMemo(
    () => fields.find((field) => field.id === inspectFieldId) ?? null,
    [fields, inspectFieldId],
  );
  const scopeNames = useMemo(() => sourceScope?.items.map((item) => item.name) ?? [], [sourceScope?.items]);

  useEffect(() => {
    setSelectedScope(scopeNames);
    setLinkScope([]);
  }, [scopeNames]);

  const activeLinkScope = useMemo(
    () => effectiveLinkScope(linkScope, selectedScope, scopeNames),
    [linkScope, selectedScope, scopeNames],
  );
  const scopeLinkAnalysis = useMemo(
    () => analyzeScopeLinks(selectedScope, activeLinkScope, sourceScope?.relationships ?? []),
    [selectedScope, activeLinkScope, sourceScope?.relationships],
  );

  const handleSelectSource = (sourceId: string): void => {
    setSelectedSourceId(sourceId);
    resetReview();
  };

  const handleStartScan = async (): Promise<void> => {
    if (!selectedSourceId || selectedScope.length === 0) return;
    setBusyPhase('scanning');
    resetReview();
    try {
      const run = await createScan.mutateAsync({
        sourceId: selectedSourceId,
        selectedScope,
        linkScope: activeLinkScope,
      });
      justCreatedRunId.current = run.id;
      hydratedRunId.current = run.id;
      setCurrentRunId(run.id);
      setDatasetId(null);
      setActiveTab(TAB.REVIEW);
      onRunCreated?.(run.id);
      notify(`Đã quét xong: ${run.field_profiles.length} cột cần duyệt.`);
    } catch (error) {
      notify(getErrorMessage(error, 'Không thể quét nguồn dữ liệu.'), 'error');
    } finally {
      setBusyPhase(null);
    }
  };

  const clearIssuesFor = (fieldIds: number[]): void => {
    setDecisionIssues((current) => current.filter((issue) => !fieldIds.includes(issue.fieldId)));
  };

  const handleOpenInspector = (fieldId: number, action?: PolicyAction): void => {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    setInspectInitialAction(action ?? getFieldAction(field));
    setInspectFieldId(fieldId);
  };

  const handleFieldActionChange = (fieldId: number, action: PolicyAction): void => {
    const field = fields.find((item) => item.id === fieldId);
    if (!editable || (field && isActionDisabledFor(field, action))) return;
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

  const handleAcceptAllAi = (): void => {
    setDecisionOverrides({});
    setFieldNotes({});
    setDecisionIssues([]);
    setDecisionError(null);
    notify('Đã khôi phục toàn bộ đề xuất của hệ thống.', 'info');
  };

  /** Shows a field in the review table (clears filters, expands its table, scrolls, highlights, opens it). */
  const handleGoToField = (fieldId: number): void => {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    setActiveTab(TAB.REVIEW);
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

  const showDecisionIssues = (issues: DecisionIssue[]): void => {
    setDecisionIssues(issues);
    setDecisionError(null);
    setActiveTab(TAB.REVIEW);
    window.setTimeout(() => {
      document.getElementById('decision-issues')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  /** "Lưu": checks the decisions first, then asks for the dataset name before saving anything. */
  const requestSaveAndBuild = (): void => {
    if (!currentRunId || !currentRun) return;

    // Catch every problem up front so the DPO can fix them all, not one 422 at a time.
    const issues = collectDecisionIssues({
      fields,
      getAction: getFieldAction,
      notes: fieldNotes,
      joinGroups,
      today: new Date().toISOString().slice(0, 10),
    });
    if (issues.length > 0) {
      showDecisionIssues(issues);
      notify(`Có ${issues.length} cột cần sửa trước khi lưu.`, 'warning');
      return;
    }
    setNameDialogOpen(true);
  };

  /** Saves every decision, then (re)builds and verifies the protected data the Analyst reads. */
  const handleSaveAndBuild = async (datasetName: string): Promise<void> => {
    setNameDialogOpen(false);
    if (!currentRunId || !currentRun) return;
    setDecisionError(null);
    setDecisionIssues([]);
    try {
      setBusyPhase('saving');
      await updateDecisions.mutateAsync(
        fields.map((field) =>
          buildFieldDecisionPayload({
            fieldProfileId: field.id,
            fieldPath: field.field_path,
            kind: getFieldKind(field.classification),
            action: getFieldAction(field),
            recommendedAction: field.recommended_action,
            note: fieldNotes[field.id],
          }),
        ),
      );
      setBusyPhase('building');
      const result = await buildDataset.mutateAsync(datasetName);
      setDatasetId(result.dataset.id);
      if (result.dataset.status === 'VERIFIED') {
        notify('Đã lưu và kiểm định xong. Có thể phát hành cho Analyst.');
      } else {
        setActiveTab(TAB.SNAPSHOT);
        notify('Đã lưu nhưng dữ liệu không qua kiểm định. Xem chi tiết và điều chỉnh quyết định.', 'error');
      }
    } catch (error) {
      const serverIssues = error instanceof ApiError ? issuesFromApiError(error.response, fields) : [];
      if (serverIssues.length > 0) {
        showDecisionIssues(serverIssues);
      } else {
        setDecisionError(getErrorMessage(error, 'Không thể lưu quyết định. Vui lòng thử lại.'));
        setActiveTab(TAB.REVIEW);
      }
      notify('Chưa lưu được.', 'error');
    } finally {
      setBusyPhase(null);
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!datasetId) return;
    setBusyPhase('publishing');
    try {
      await publishDataset.mutateAsync(datasetId);
      notify(`Đã phát hành lượt quét #${currentRunId ?? ''}. Analyst có thể truy cập ngay.`);
    } catch (error) {
      notify(getErrorMessage(error, 'Không thể phát hành.'), 'error');
    } finally {
      setBusyPhase(null);
    }
  };

  const handleRevoke = async (): Promise<void> => {
    if (!datasetId) return;
    setBusyPhase('revoking');
    try {
      await revokeDataset.mutateAsync(datasetId);
      notify('Đã thu hồi. Bạn có thể sửa quyết định, lưu và phát hành lại.', 'info');
    } catch (error) {
      notify(getErrorMessage(error, 'Không thể thu hồi.'), 'error');
    } finally {
      setBusyPhase(null);
    }
  };

  const handleAction = (action: ReviewAction): void => {
    if (action === 'BUILD') requestSaveAndBuild();
    else if (action === 'PUBLISH') setPendingConfirm({ kind: 'PUBLISH' });
    else if (action === 'REVOKE') setPendingConfirm({ kind: 'REVOKE' });
    else navigate(routes.dpo);
  };

  const removeSource = async (sourceId: string, force: boolean): Promise<void> => {
    await deleteSource.mutateAsync({ sourceId, force });
    if (selectedSourceId === sourceId) setSelectedSourceId(null);
    void refetchSources();
    notify('Đã xóa nguồn dữ liệu.', 'info');
  };

  const handleDeleteSource = async (sourceId: string): Promise<void> => {
    try {
      await removeSource(sourceId, false);
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể xóa nguồn dữ liệu.');
      if (message.includes('Source has runs')) setPendingConfirm({ kind: 'FORCE_DELETE_SOURCE', sourceId });
      else notify(message, 'error');
    }
  };

  const handleConfirm = async (): Promise<void> => {
    const confirm = pendingConfirm;
    setPendingConfirm(null);
    if (confirm?.kind === 'PUBLISH') await handlePublish();
    else if (confirm?.kind === 'REVOKE') await handleRevoke();
    else if (confirm?.kind === 'FORCE_DELETE_SOURCE') {
      try {
        await removeSource(confirm.sourceId, true);
      } catch (error) {
        notify(getErrorMessage(error, 'Không thể xóa nguồn dữ liệu.'), 'error');
      }
    }
  };

  /** Called by the inspector once its draft passed validation. */
  const handleSaveInspector = (action: PolicyAction, note: FieldDecisionNote): void => {
    if (!activeInspectField || !editable) return;
    setDecisionError(null);
    applyActionToGroup(activeInspectField.id, action);
    setFieldNotes((current) => ({ ...current, [activeInspectField.id]: note }));
    clearIssuesFor(joinGroups.get(activeInspectField.id) ?? [activeInspectField.id]);
    setInspectFieldId(null);
  };

  const handleOpenReport = (): void => {
    if (!currentRunId) return;
    // Open the tab now (popup blockers), then load the report with the Authorization header so
    // the session token never ends up in a URL, the browser history or server access logs.
    const reportWindow = window.open('', '_blank');
    void fetchRunReportHtml(currentRunId)
      .then((html) => {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        if (reportWindow) reportWindow.location.href = url;
        else window.open(url, '_blank');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      })
      .catch((error: unknown) => {
        reportWindow?.close();
        notify(getErrorMessage(error, 'Không thể mở báo cáo tuân thủ. Vui lòng thử lại.'), 'error');
      });
  };

  // Same function every render, so the memoized rows only re-render when their own field changes.
  const handleRowActionChange = useStableCallback(handleFieldActionChange);
  const handleRowInspect = useStableCallback((fieldId: number) => handleOpenInspector(fieldId));

  if (sourcesLoading) {
    return (
      <MascotLoader title="Đang tải nguồn dữ liệu…" />
    );
  }

  const confirmCopy: Record<PendingConfirm['kind'], { title: string; description: string; label: string }> = {
    PUBLISH: {
      title: `Phát hành lượt quét #${currentRunId ?? ''}?`,
      description:
        'Mọi Analyst sẽ xem được dữ liệu đã bảo vệ của lượt quét này. Sau khi phát hành, quyết định bị khóa cho tới khi thu hồi.',
      label: 'Phát hành',
    },
    REVOKE: {
      title: `Thu hồi lượt quét #${currentRunId ?? ''}?`,
      description:
        'Analyst sẽ không xem được nữa và dữ liệu đã bảo vệ bị xóa. Quyết định được giữ nguyên: bạn có thể sửa, lưu và phát hành lại.',
      label: 'Thu hồi',
    },
    FORCE_DELETE_SOURCE: {
      title: 'Xóa nguồn dữ liệu?',
      description: 'Nguồn này đã có lượt quét trong lịch sử kiểm toán. Xóa vĩnh viễn nguồn cùng toàn bộ dữ liệu quét liên quan?',
      label: 'Xóa vĩnh viễn',
    },
  };

  const renderReviewContent = (): JSX.Element => {
    if (busyPhase === 'scanning') {
      return (
        <MascotLoader
          pose="scanning"
          title="Đang quét và phân tích dữ liệu PII…"
          description="Đối sánh mẫu nhận diện tiếng Việt và phân loại theo Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP."
        />
      );
    }
    if (currentRunId !== null && !currentRun) {
      return (
        <MascotLoader title="Đang mở lượt quét…" />
      );
    }
    if (!currentRun) {
      if (!sources || sources.length === 0) {
        return (
          <StateNotice
            kind="empty"
            title="Chưa có nguồn dữ liệu"
            description="Thêm một cơ sở dữ liệu PostgreSQL hoặc MongoDB để bắt đầu quét PII."
            actionLabel="Thêm cơ sở dữ liệu"
            onAction={() => setAddSourceOpen(true)}
          />
        );
      }
      if (scopeFailed && !scopeFetching) {
        return (
          <StateNotice
            kind="error"
            title="Không đọc được danh sách bảng của nguồn này"
            description={
              scopeError instanceof ApiError
                ? scopeError.message
                : 'Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.'
            }
            actionLabel="Thử lại"
            onAction={() => void refetchScope()}
          />
        );
      }
      if (!sourceScope) {
        return (
          <MascotLoader
            title="Đang đọc danh sách bảng từ nguồn…"
            description="Hệ thống chỉ đọc tên bảng, tên cột và khóa, không đọc dữ liệu. Nguồn ở xa có thể mất vài giây."
          />
        );
      }
      return (
        <ScopeSelectionStep
          scope={sourceScope}
          selected={selectedScope}
          linkTables={activeLinkScope}
          analysis={scopeLinkAnalysis}
          scanning={false}
          onToggle={(name) =>
            setSelectedScope((current) =>
              current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
            )
          }
          onSelectAll={() => setSelectedScope((current) => (current.length === scopeNames.length ? [] : scopeNames))}
          onAddLink={(table) => setLinkScope((current) => (current.includes(table) ? current : [...current, table]))}
          onRemoveLink={(table) => setLinkScope((current) => current.filter((item) => item !== table))}
          onScan={() => void handleStartScan()}
        />
      );
    }
    return (
      <Stack spacing={2}>
        <DecisionNotices
          lock={reviewActions.lock}
          unsavedChanges={datasetStatus === 'VERIFIED' ? pendingChanges : 0}
          error={decisionError}
          issues={decisionIssues}
          onDismissError={() => setDecisionError(null)}
          onDismissIssues={() => setDecisionIssues([])}
          onGoToField={handleGoToField}
        />
        <RunKpiCards
          stats={fieldStats}
          riskScore={riskScore ?? null}
          canRestoreAi={editable}
          onRestoreAi={handleAcceptAllAi}
        />
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <ReviewToolbar
            search={columnSearch}
            onSearchChange={setColumnSearch}
            filter={actionFilter}
            onFilterChange={setActionFilter}
            totalCount={fields.length}
            actionCounts={actionCounts}
          />
          <FieldReviewTable
            groups={fieldGroups}
            collapsed={collapsedSources}
            onToggleGroup={(sourcePath) =>
              setCollapsedSources((current) => ({ ...current, [sourcePath]: !current[sourcePath] }))
            }
            editable={editable}
            highlightFieldId={highlightFieldId}
            issueFieldIds={issueFieldIds}
            getAction={getFieldAction}
            getJoinPartnerLabel={getJoinLabel}
            isActionDisabled={isActionDisabledFor}
            getActionOptionNote={getActionOptionNote}
            onActionChange={handleRowActionChange}
            onInspect={handleRowInspect}
          />
        </Paper>
      </Stack>
    );
  };

  const subtitle = currentRun
    ? `Nguồn: ${currentRun.source_name} (${currentRun.engine})${scopeLabel ? ` · Bảng ${scopeLabel}` : ''}`
    : 'Chọn các bảng cần quét rồi bấm “Bắt đầu quét”. Chỉ các bảng đã quét mới được phát hành cho Analyst.';

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      <RunHeader
        sourcePicker={
          <SourcePicker
            sources={sources ?? []}
            selectedId={currentRun?.source_id ?? (currentRunId === null ? selectedSourceId : null)}
            disabled={currentRunId !== null || busyPhase !== null}
            deleting={deleteSource.isPending}
            onSelect={handleSelectSource}
            onDelete={(sourceId) => void handleDeleteSource(sourceId)}
            onAdd={() => setAddSourceOpen(true)}
            onRefresh={() => void refetchSources()}
          />
        }
        run={currentRun ?? null}
        subtitle={subtitle}
        actions={reviewActions}
        busyLabel={busyPhase ? BUSY_LABELS[busyPhase] : null}
        primaryDisabled={reviewActions.primary === 'BUILD' && fields.length === 0}
        onAction={handleAction}
        onOpenReport={handleOpenReport}
      />

      {currentRun && (
        <Tabs
          value={activeTab}
          onChange={(_, value: number) => setActiveTab(value)}
          variant="scrollable"
          sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Tổng quan & phân loại PII" />
          <Tab label="Rủi ro & đánh giá" />
          <Tab label="Nhật ký hoạt động" />
          <Tab label="Dữ liệu cho Analyst" />
        </Tabs>
      )}

      <Box sx={{ pt: 3 }}>
        {(!currentRun || activeTab === TAB.REVIEW) && renderReviewContent()}
        {currentRun && activeTab === TAB.RISK && (
          <RiskInsightsTab
            riskScore={riskScore ?? null}
            protectionRates={protectionRates}
            actionCounts={actionCounts}
            fieldCount={fields.length}
          />
        )}
        {currentRun && activeTab === TAB.AUDIT && (
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <AuditTrail runId={currentRun.id} />
          </Paper>
        )}
        {currentRun && activeTab === TAB.SNAPSHOT && (
          <SnapshotTab datasetId={datasetId} datasetStatus={datasetStatus} />
        )}
      </Box>

      <AddSourceDialog
        open={addSourceOpen}
        onClose={() => setAddSourceOpen(false)}
        onCreated={(sourceId) => handleSelectSource(sourceId)}
      />

      <DatasetNameDialog
        open={nameDialogOpen}
        title="Đặt tên dữ liệu cho Analyst"
        confirmLabel="Lưu"
        initialName={suggestedDatasetName}
        onConfirm={(name) => void handleSaveAndBuild(name)}
        onClose={() => setNameDialogOpen(false)}
      />

      {pendingConfirm && (
        <ConfirmDialog
          open
          title={confirmCopy[pendingConfirm.kind].title}
          description={confirmCopy[pendingConfirm.kind].description}
          confirmLabel={confirmCopy[pendingConfirm.kind].label}
          destructive={pendingConfirm.kind !== 'PUBLISH'}
          onConfirm={() => void handleConfirm()}
          onClose={() => setPendingConfirm(null)}
        />
      )}

      <Drawer
        anchor="right"
        open={Boolean(activeInspectField)}
        onClose={() => setInspectFieldId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: DETAIL_DRAWER_WIDTH }, p: 3, display: 'flex', flexDirection: 'column' } }}
      >
        {activeInspectField && (
          <FieldPolicyDrawerContent
            key={activeInspectField.id}
            field={activeInspectField}
            initialAction={inspectInitialAction}
            initialNote={fieldNotes[activeInspectField.id] ?? EMPTY_FIELD_NOTE}
            joinPartnerLabel={getJoinLabel(activeInspectField.id)}
            isActionDisabled={(action) => isActionDisabledFor(activeInspectField, action)}
            getActionOptionNote={(action) => getActionOptionNote(activeInspectField, action)}
            onSave={handleSaveInspector}
            onClose={() => setInspectFieldId(null)}
            readOnly={!editable}
          />
        )}
      </Drawer>
    </Box>
  );
}
