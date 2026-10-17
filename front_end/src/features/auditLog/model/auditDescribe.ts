/**
 * Turns raw audit events (machine notes such as `count=10; changes=[...]` or
 * `build -> VERIFIED (verifier passed)`) into plain Vietnamese for the activity log.
 * The raw note stays available in the detail panel; this only changes how it is read.
 */

export type AuditCategory = 'scan' | 'publish' | 'source' | 'session';
export type AuditTone = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface DecisionChange {
  column: string;
  version: number;
  /** Previous action, or null for the first decision on the column. */
  from: string | null;
  to: string;
  /** Plain reason: "Theo đề xuất", "DPO tự chọn", or what the DPO typed. */
  note: string;
}

export interface AuditDescription {
  title: string;
  summary: string;
  tone: AuditTone;
  category: AuditCategory;
  /** Per-column decisions of a "save" event, for the detail panel. */
  changes: DecisionChange[];
}

interface DescribableEvent {
  action: string;
  reason: string;
}

const CATEGORY_ACTIONS: Record<AuditCategory, string[]> = {
  scan: [
    'create_run',
    'request_run',
    'cancel_run',
    'delete_run',
    'save_decisions',
    'build_run',
    'orchestrate_run',
    'export_report',
    'supersede_snapshot',
  ],
  publish: ['publish_dataset', 'revoke_dataset', 'grant_dataset', 'revoke_dataset_grant'],
  source: ['create_source', 'delete_source'],
  session: ['login', 'logout', 'login_failed', 'login_rate_limited'],
};

export const AUDIT_FILTERS = [
  { value: 'DATA', label: 'Hoạt động dữ liệu', actions: [...CATEGORY_ACTIONS.scan, ...CATEGORY_ACTIONS.publish, ...CATEGORY_ACTIONS.source] },
  { value: 'scan', label: 'Quét & duyệt', actions: CATEGORY_ACTIONS.scan },
  { value: 'publish', label: 'Phát hành & thu hồi', actions: CATEGORY_ACTIONS.publish },
  { value: 'source', label: 'Nguồn dữ liệu', actions: CATEGORY_ACTIONS.source },
  { value: 'session', label: 'Đăng nhập', actions: CATEGORY_ACTIONS.session },
] as const;

export type AuditFilterValue = (typeof AUDIT_FILTERS)[number]['value'];

const POLICY_LABELS: Record<string, string> = {
  MASK: 'Che dữ liệu',
  REDACT: 'Che thực thể',
  HMAC: 'Băm HMAC',
  DROP: 'Loại bỏ',
  KEEP: 'Giữ nguyên',
};

const RUN_STATUS_LABELS: Record<string, string> = {
  REVIEW_REQUIRED: 'chờ duyệt',
  READY_TO_BUILD: 'chờ lưu',
  VERIFIED: 'chờ phát hành',
  PUBLISHED: 'đã phát hành',
  FAILED: 'lỗi',
  REVOKED: 'đã thu hồi',
  CANCELLED: 'đã huỷ',
};

export function getPolicyLabel(action: string | null): string {
  if (action === null) return '—';
  return POLICY_LABELS[action] ?? action;
}

function categoryOf(action: string): AuditCategory {
  const found = (Object.keys(CATEGORY_ACTIONS) as AuditCategory[]).find((key) => CATEGORY_ACTIONS[key].includes(action));
  return found ?? 'scan';
}

/** "a=1; b=x,y" → { a: '1', b: 'x,y' }. */
export function parseKeyValues(reason: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const part of reason.split(';')) {
    const index = part.indexOf('=');
    if (index > 0) values[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return values;
}

const CHANGE_PATTERN = /([^\s;[\]]+)\[v(\d+)\]: (\w+) -> (\w+) \(reason: '([\s\S]*?)'\)(?=;|\]$|$)/g;

function humanizeNote(note: string): string {
  if (/^DPO accepted suggested \w+ policy/.test(note)) return 'Theo đề xuất';
  if (/^DPO changed policy to \w+/.test(note)) return 'DPO tự chọn';
  return note;
}

/** Columns of a `save_decisions` note: `table.col[v2]: HMAC -> MASK (reason: '...')`. */
export function parseDecisionChanges(reason: string): DecisionChange[] {
  return Array.from(reason.matchAll(CHANGE_PATTERN), ([, column = '', version = '1', from = '', to = '', note = '']) => ({
    column,
    version: Number(version),
    from: from === 'NEW' ? null : from,
    to,
    note: humanizeNote(note),
  }));
}

function listPreview(items: string[], max = 3): string {
  if (items.length <= max) return items.join(', ');
  return `${items.slice(0, max).join(', ')} +${items.length - max}`;
}

function describeSave(reason: string): Pick<AuditDescription, 'summary' | 'changes'> {
  const changes = parseDecisionChanges(reason);
  const count = Number(parseKeyValues(reason).count) || changes.length;
  if (changes.length === 0) return { summary: `Lưu quyết định cho ${count} cột`, changes };
  const firstSave = changes.every((change) => change.from === null);
  if (firstSave) {
    const custom = changes.filter((change) => change.note !== 'Theo đề xuất').length;
    const suffix = custom > 0 ? ` · ${custom} cột khác đề xuất` : ' · theo toàn bộ đề xuất';
    return { summary: `Duyệt lần đầu ${count} cột${suffix}`, changes };
  }
  const edited = changes.filter((change) => change.from !== change.to);
  if (edited.length === 0) return { summary: `Lưu lại ${count} cột, không đổi hành động nào`, changes };
  const preview = edited
    .slice(0, 2)
    .map((change) => `${change.column.split('.').pop() ?? change.column}: ${getPolicyLabel(change.from)} → ${getPolicyLabel(change.to)}`);
  const more = edited.length > 2 ? ` +${edited.length - 2} cột` : '';
  return { summary: `Đổi ${edited.length} cột — ${preview.join('; ')}${more}`, changes };
}

function describeScan(reason: string): string {
  const values = parseKeyValues(reason);
  const tables = values.scope && values.scope !== 'all' ? values.scope.split(',').filter(Boolean) : [];
  const scope = tables.length > 0 ? `${tables.length} bảng (${listPreview(tables)})` : 'toàn bộ bảng';
  const scan = values.scan ?? '';
  const method = scan.endsWith('ai') ? ' bằng AI' : scan === 'stub' ? ' trên dữ liệu mẫu' : scan.endsWith('rule') ? ' bằng luật nhận diện' : '';
  return `Quét ${scope}${method}`;
}

function describeBuild(reason: string): Pick<AuditDescription, 'summary' | 'tone'> {
  const again = reason.startsWith('rebuild') ? 'Tạo lại' : 'Tạo';
  if (reason.includes('FAILED')) {
    return { summary: `${again} dữ liệu cho Analyst — kiểm định không đạt`, tone: 'error' };
  }
  return { summary: `${again} dữ liệu cho Analyst — kiểm định đạt`, tone: 'success' };
}

function describeRevoke(reason: string): Pick<AuditDescription, 'summary' | 'tone'> {
  if (reason.includes('_failed')) {
    return { summary: 'Analyst không còn truy cập · xoá dữ liệu đã bảo vệ gặp lỗi, cần kiểm tra', tone: 'error' };
  }
  return { summary: 'Analyst không còn truy cập · đã xoá dữ liệu đã bảo vệ', tone: 'warning' };
}

export function describeAuditEvent(event: DescribableEvent): AuditDescription {
  const { action, reason } = event;
  const base = { tone: 'default' as AuditTone, category: categoryOf(action), changes: [] as DecisionChange[] };
  const values = parseKeyValues(reason);

  switch (action) {
    case 'create_run':
      return { ...base, title: 'Quét PII', summary: describeScan(reason), tone: 'primary' };
    case 'save_decisions':
      return { ...base, title: 'Lưu quyết định', ...describeSave(reason), tone: 'info' };
    case 'build_run':
      return { ...base, title: 'Tạo dữ liệu cho Analyst', ...describeBuild(reason) };
    case 'publish_dataset':
      return { ...base, title: 'Phát hành', summary: 'Analyst có thể xem dữ liệu đã bảo vệ', tone: 'success' };
    case 'revoke_dataset':
      return { ...base, title: 'Thu hồi', ...describeRevoke(reason) };
    case 'delete_run': {
      const status = RUN_STATUS_LABELS[values.status ?? ''] ?? values.status ?? 'không rõ';
      return { ...base, title: 'Xoá lượt quét', summary: `Xoá lượt quét đang ở trạng thái ${status}`, tone: 'error' };
    }
    case 'cancel_run':
      return { ...base, title: 'Huỷ lượt quét', summary: 'Lượt quét bị huỷ trước khi hoàn tất', tone: 'warning' };
    case 'request_run':
      return { ...base, title: 'Yêu cầu quét', summary: 'Analyst gửi yêu cầu quét để DPO duyệt' };
    case 'orchestrate_run':
      return { ...base, title: 'Chạy tự động', summary: 'Quét, duyệt và tạo dữ liệu theo quy trình tự động' };
    case 'export_report': {
      const format = (values.format ?? 'html').toUpperCase();
      const kind = values.summary === 'True' ? 'bản tóm tắt' : 'bản đầy đủ';
      return { ...base, title: 'Xuất báo cáo tuân thủ', summary: `Báo cáo ${format}, ${kind}` };
    }
    case 'supersede_snapshot':
      return { ...base, title: 'Thay bản dữ liệu cũ', summary: 'Bản dữ liệu cũ bị thay khi lưu lại quyết định' };
    case 'grant_dataset':
      return { ...base, title: 'Cấp quyền xem', summary: `Cấp quyền cho Analyst #${values['grant to user_id'] ?? '?'}` };
    case 'revoke_dataset_grant':
      return { ...base, title: 'Huỷ quyền xem', summary: 'Huỷ quyền xem của một Analyst', tone: 'warning' };
    case 'create_source': {
      const engine = values.engine === 'mongodb' ? 'MongoDB' : values.engine === 'postgresql' ? 'PostgreSQL' : values.engine;
      return { ...base, title: 'Thêm nguồn dữ liệu', summary: engine ? `Kết nối ${engine}` : 'Kết nối nguồn mới', tone: 'primary' };
    }
    case 'delete_source':
      return { ...base, title: 'Xoá nguồn dữ liệu', summary: 'Gỡ kết nối nguồn dữ liệu', tone: 'error' };
    case 'login':
      return { ...base, title: 'Đăng nhập', summary: 'Đăng nhập thành công' };
    case 'logout':
      return { ...base, title: 'Đăng xuất', summary: 'Kết thúc phiên làm việc' };
    case 'login_failed':
      return { ...base, title: 'Đăng nhập thất bại', summary: 'Sai tên đăng nhập hoặc mật khẩu', tone: 'warning' };
    case 'login_rate_limited':
      return { ...base, title: 'Tạm khoá đăng nhập', summary: 'Thử sai quá nhiều lần', tone: 'error' };
    default:
      return { ...base, title: action, summary: reason || '—' };
  }
}
