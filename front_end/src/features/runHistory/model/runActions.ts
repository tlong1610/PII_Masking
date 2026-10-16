import type { StatusTone } from '@/shared/ui';

export const RUN_STATUSES = [
  'NEW',
  'SCANNING',
  'REVIEW_REQUIRED',
  'READY_TO_BUILD',
  'BUILDING',
  'VERIFIED',
  'PUBLISHED',
  'FAILED',
  'STALE',
  'REVOKED',
  'CANCELLED',
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

const STATUS_META: Record<RunStatus, { label: string; tone: StatusTone }> = {
  NEW: { label: 'Mới tạo', tone: 'default' },
  SCANNING: { label: 'Đang quét', tone: 'info' },
  REVIEW_REQUIRED: { label: 'Chờ duyệt', tone: 'warning' },
  READY_TO_BUILD: { label: 'Chờ lưu', tone: 'warning' },
  BUILDING: { label: 'Đang lưu', tone: 'info' },
  VERIFIED: { label: 'Chờ phát hành', tone: 'info' },
  PUBLISHED: { label: 'Đã phát hành', tone: 'success' },
  FAILED: { label: 'Lỗi', tone: 'error' },
  STALE: { label: 'Lỗi thời', tone: 'warning' },
  REVOKED: { label: 'Đã thu hồi', tone: 'error' },
  CANCELLED: { label: 'Đã huỷ', tone: 'default' },
};

export function getRunStatusLabel(status: RunStatus): string {
  return STATUS_META[status].label;
}

export function getRunStatusTone(status: RunStatus): StatusTone {
  return STATUS_META[status].tone;
}

export type RunNextAction =
  | { kind: 'review'; label: string }
  | { kind: 'publish'; label: string; datasetId: number }
  | { kind: 'revoke'; label: string; datasetId: number }
  | { kind: 'view'; label: string };

interface RunLike {
  status: RunStatus;
  latest_dataset_id?: number | null;
  latest_dataset_status?: string | null;
}

/** A run whose verifier failed still has its dataset and is fixed by editing the decisions. */
function isFixable(run: RunLike): boolean {
  return run.status === 'FAILED' && Boolean(run.latest_dataset_id);
}

/** What the DPO most likely wants to do next with a run in the history list. */
export function getRunNextAction(run: RunLike): RunNextAction {
  const datasetId = run.latest_dataset_id ?? null;
  if (run.status === 'REVIEW_REQUIRED' || run.status === 'READY_TO_BUILD' || isFixable(run)) {
    return { kind: 'review', label: 'Tiếp tục duyệt' };
  }
  if (run.status === 'VERIFIED' && datasetId !== null) return { kind: 'publish', label: 'Phát hành', datasetId };
  if (run.status === 'PUBLISHED' && datasetId !== null) return { kind: 'revoke', label: 'Thu hồi', datasetId };
  return { kind: 'view', label: 'Mở' };
}

/** A revoked dataset sends its run back to review; the list says so instead of a bare "Chờ lưu". */
export function wasRevoked(run: RunLike): boolean {
  return run.latest_dataset_status === 'REVOKED' && run.status !== 'PUBLISHED';
}

export const RUN_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'REVIEW', label: 'Chờ duyệt' },
  { value: 'READY', label: 'Chờ phát hành' },
  { value: 'PUBLISHED', label: 'Đã phát hành' },
  { value: 'OTHER', label: 'Lỗi / đã huỷ' },
] as const;

export type RunTab = (typeof RUN_TABS)[number]['value'];

export function getRunTab(run: RunLike): Exclude<RunTab, 'ALL'> {
  switch (run.status) {
    case 'VERIFIED':
      return 'READY';
    case 'PUBLISHED':
      return 'PUBLISHED';
    case 'NEW':
    case 'SCANNING':
    case 'REVIEW_REQUIRED':
    case 'READY_TO_BUILD':
    case 'BUILDING':
      return 'REVIEW';
    default:
      return isFixable(run) ? 'REVIEW' : 'OTHER';
  }
}

const LIVE_DATASET_STATUSES = new Set(['VERIFIED', 'PUBLISHED']);

/**
 * Why a run cannot be deleted yet, or null when it can. Mirrors the backend guard: a run whose
 * snapshot still exists must have its dataset revoked first (drops the snapshot and Analyst grants).
 */
export function getRunDeleteBlocker(run: {
  latest_dataset_id?: number | null;
  latest_dataset_status?: string | null;
}): string | null {
  if (run.latest_dataset_id && run.latest_dataset_status && LIVE_DATASET_STATUSES.has(run.latest_dataset_status)) {
    return `Còn dataset #${run.latest_dataset_id} đang có snapshot. Thu hồi dataset trước khi xoá run.`;
  }
  return null;
}
