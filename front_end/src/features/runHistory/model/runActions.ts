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
  READY_TO_BUILD: { label: 'Sẵn sàng build', tone: 'info' },
  BUILDING: { label: 'Đang build', tone: 'info' },
  VERIFIED: { label: 'Đã kiểm định', tone: 'info' },
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
  | { kind: 'dataset'; label: string; datasetId: number }
  | { kind: 'view'; label: string };

/** What the DPO most likely wants to do next with a run in the history list. */
export function getRunNextAction(run: { status: RunStatus; latest_dataset_id?: number | null }): RunNextAction {
  const datasetId = run.latest_dataset_id ?? null;
  switch (run.status) {
    case 'REVIEW_REQUIRED':
    case 'READY_TO_BUILD':
      return { kind: 'review', label: 'Tiếp tục duyệt' };
    case 'VERIFIED':
      return datasetId !== null
        ? { kind: 'dataset', label: 'Xem & phát hành', datasetId }
        : { kind: 'review', label: 'Mở run' };
    case 'PUBLISHED':
    case 'REVOKED':
      return datasetId !== null ? { kind: 'dataset', label: 'Xem dataset', datasetId } : { kind: 'view', label: 'Mở run' };
    default:
      return { kind: 'view', label: 'Mở run' };
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
