const ACTION_LABELS: Record<string, string> = {
  login: 'Đăng nhập',
  login_failed: 'Đăng nhập thất bại',
  login_rate_limited: 'Chặn đăng nhập (quá số lần)',
  logout: 'Đăng xuất',
  create_source: 'Thêm nguồn dữ liệu',
  delete_source: 'Xoá nguồn dữ liệu',
  create_run: 'Quét PII',
  request_run: 'Yêu cầu quét',
  cancel_run: 'Huỷ lượt quét',
  delete_run: 'Xoá lượt quét',
  save_decisions: 'Lưu quyết định',
  build_run: 'Tạo snapshot',
  orchestrate_run: 'Chạy tự động',
  export_report: 'Xuất báo cáo',
  publish_dataset: 'Phát hành dataset',
  revoke_dataset: 'Thu hồi dataset',
  grant_dataset: 'Cấp quyền dataset',
  revoke_dataset_grant: 'Thu hồi quyền dataset',
};

export const AUDIT_ACTIONS = Object.keys(ACTION_LABELS);

export const AUDIT_ENTITY_TYPES = ['run', 'dataset', 'source', 'session'] as const;

export function getAuditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** First and last characters of a SHA-256 hex digest, enough to compare entries by eye. */
export function shortenHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

export type AuditEntityLink = { kind: 'run' | 'dataset'; id: number } | null;

/** Runs and datasets have their own pages; other entities are shown as plain text. */
export function getAuditEntityLink(entityType: string, entityId: string): AuditEntityLink {
  const id = Number(entityId);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (entityType === 'run' || entityType === 'dataset') return { kind: entityType, id };
  return null;
}
