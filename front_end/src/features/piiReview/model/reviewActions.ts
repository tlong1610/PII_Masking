import type { DatasetStatus, PolicyAction } from './policyLabels';

export type ReviewRunStatus =
  | 'NEW'
  | 'SCANNING'
  | 'REVIEW_REQUIRED'
  | 'READY_TO_BUILD'
  | 'BUILDING'
  | 'VERIFIED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'STALE'
  | 'REVOKED'
  | 'CANCELLED';

/**
 * What the run page offers next. "Lưu" saves the decisions and (re)builds the protected data the
 * Analyst will read; there is no separate snapshot step for the DPO.
 */
export type ReviewAction = 'BUILD' | 'PUBLISH' | 'REVOKE' | 'RESCAN';

export interface ReviewLock {
  title: string;
  message: string;
}

export interface ReviewActions {
  primary: ReviewAction | null;
  secondary: ReviewAction | null;
  /** Decisions can be changed on screen right now (until the run is published). */
  editable: boolean;
  /** Why decisions are read-only, or null when they are editable (or there is no run). */
  lock: ReviewLock | null;
}

interface ReviewActionsInput {
  runStatus: ReviewRunStatus | null;
  /** Status of the run's dataset, or null when it was never saved. */
  datasetStatus: DatasetStatus | null;
  /** Decisions on screen differ from the saved ones. */
  hasPendingChanges: boolean;
}

const EDITING = { secondary: null, editable: true, lock: null } as const;

function locked(lock: ReviewLock, primary: ReviewAction | null = null, secondary: ReviewAction | null = null) {
  return { primary, secondary, editable: false, lock };
}

export function getReviewActions({ runStatus, datasetStatus, hasPendingChanges }: ReviewActionsInput): ReviewActions {
  switch (runStatus) {
    case null:
      return { primary: null, secondary: null, editable: false, lock: null };
    case 'NEW':
    case 'SCANNING':
      return locked({ title: 'Đang quét.', message: 'Kết quả phân loại sẽ hiện khi quét xong.' });
    case 'BUILDING':
      return locked({ title: 'Đang lưu.', message: 'Dữ liệu đã bảo vệ đang được tạo và kiểm định.' });
    case 'REVIEW_REQUIRED':
    case 'READY_TO_BUILD':
      return { ...EDITING, primary: 'BUILD' };
    case 'VERIFIED':
      // Publishing would ship the saved decisions, so unsaved edits must be saved first.
      return { ...EDITING, primary: hasPendingChanges ? 'BUILD' : 'PUBLISH' };
    case 'FAILED':
      return datasetStatus === null
        ? locked({ title: 'Lượt quét thất bại.', message: 'Hãy quét lại để tạo lượt mới.' }, 'RESCAN')
        : { ...EDITING, primary: 'BUILD' };
    case 'PUBLISHED':
      return locked(
        { title: 'Đã phát hành.', message: 'Analyst đang dùng dữ liệu này. Thu hồi nếu cần chỉnh sửa quyết định.' },
        null,
        'REVOKE',
      );
    case 'STALE':
    case 'REVOKED':
    case 'CANCELLED':
      return locked({ title: 'Lượt quét không còn hiệu lực.', message: 'Hãy quét lại để tạo lượt mới.' }, 'RESCAN');
  }
}

export function getReviewActionLabel(action: ReviewAction): string {
  if (action === 'BUILD') return 'Lưu';
  if (action === 'PUBLISH') return 'Phát hành';
  if (action === 'REVOKE') return 'Thu hồi';
  return 'Quét lại';
}

interface SavedDecisionLike {
  field_profile_id: number;
  action: PolicyAction;
}

/** Fields whose action on screen differs from the saved decision (or that have no saved decision yet). */
export function countPendingChanges(
  fields: { id: number; recommended_action: PolicyAction }[],
  getAction: (field: { id: number; recommended_action: PolicyAction }) => PolicyAction,
  saved: SavedDecisionLike[],
): number {
  const savedById = new Map(saved.map((decision) => [decision.field_profile_id, decision.action]));
  return fields.filter((field) => savedById.get(field.id) !== getAction(field)).length;
}
