import type { AnalystDataset, DataSourceKind, ReviewRun, VerificationReport } from '../model/types';
import { analystDatasetSchema, dataSourceOptionSchema, reviewRunSchema, verificationReportSchema } from './schemas';

const latency = 180;

const sources = [
  {
    id: 'postgresql',
    name: 'PostgreSQL doanh nghiệp demo',
    engineLabel: 'SQL',
    connectionState: 'verified',
    scopeLabel: 'customers + orders • 20 trường • 2.000 bản ghi',
    fieldCount: 20,
    recordCount: 2000,
    unsupportedSummary: 'Object sâu và ảnh KYC nằm ngoài P0, chỉ quét metadata/ocr_text.',
    downstreamTask: 'JOIN orders ↔ customers theo customer_id đã HMAC',
  },
  {
    id: 'mongodb',
    name: 'MongoDB order profile demo',
    engineLabel: 'NoSQL',
    connectionState: 'verified',
    scopeLabel: 'customers + orders • object lồng tối đa 2 cấp',
    fieldCount: 18,
    recordCount: 2000,
    unsupportedSummary: 'Không có mảng object; trường object sâu sẽ chặn hoặc DROP.',
    downstreamTask: '$lookup orders ↔ customers theo customer_id đã HMAC',
  },
] satisfies Array<unknown>;

const baseFields: ReviewRun['fields'] = [
  {
    id: 'customer-id',
    path: 'customers.customer_id',
    dataType: 'varchar',
    filteredProfile: 'distinct cao; quan hệ khóa với orders.customer_id; không gửi mẫu raw',
    classification: 'PERSONAL_BASIC',
    taxonomyLabel: 'Định danh gián tiếp',
    legalBasis: 'Luật 91/2025/QH15 Điều 2 khoản 1',
    suggestionSource: 'rule',
    coverage: 'AUTO_SUPPORTED',
    action: 'HMAC',
    reviewState: 'accepted',
    impact: 'Giữ phép join downstream bằng mã liên kết một chiều.',
    reason: 'Khóa liên kết cần cho tác vụ đã khai báo.',
  },
  {
    id: 'full-name',
    path: 'customers.full_name',
    dataType: 'text',
    filteredProfile: 'pattern tên người; null 0%; độ dài 8-42',
    classification: 'PERSONAL_BASIC',
    taxonomyLabel: 'Họ, chữ đệm và tên',
    legalBasis: 'NĐ 356/2025/NĐ-CP Điều 3 khoản 1',
    suggestionSource: 'rule',
    coverage: 'AUTO_SUPPORTED',
    action: 'MASK',
    reviewState: 'accepted',
    impact: 'Không cần cho phép nhóm doanh thu.',
    reason: 'Che toàn bộ để giữ schema nhưng không đưa tên vào snapshot.',
  },
  {
    id: 'national-id',
    path: 'customers.identity.national_id',
    dataType: 'char(12)',
    filteredProfile: '12 chữ số; normalizer CCCD VN; null 1.4%',
    classification: 'PERSONAL_BASIC',
    taxonomyLabel: 'Số định danh cá nhân',
    legalBasis: 'NĐ 356/2025/NĐ-CP Điều 3 khoản 7',
    suggestionSource: 'rule',
    coverage: 'AUTO_SUPPORTED',
    action: 'HMAC',
    reviewState: 'accepted',
    impact: 'Không dùng trực tiếp cho Analyst; chỉ giữ dạng mã liên kết nếu cần đối soát.',
    reason: 'Không phát hành số CCCD; dùng digest có khóa.',
  },
  {
    id: 'phone',
    path: 'customers.contact.phone',
    dataType: 'text',
    filteredProfile: 'đầu số VN; độ dài 10; null 3.2%',
    classification: 'PERSONAL_BASIC',
    taxonomyLabel: 'Số điện thoại',
    legalBasis: 'NĐ 356/2025/NĐ-CP Điều 3 khoản 7',
    suggestionSource: 'rule',
    coverage: 'AUTO_SUPPORTED',
    action: 'MASK',
    reviewState: 'accepted',
    impact: 'Không ảnh hưởng lookup được duyệt.',
    reason: 'Không cần cho tác vụ phân tích.',
  },
  {
    id: 'email',
    path: 'customers.email',
    dataType: 'text',
    filteredProfile: 'pattern email; domain synthetic; null 2.1%',
    classification: 'PERSONAL_BASIC',
    taxonomyLabel: 'Thông tin giúp xác định cá nhân',
    legalBasis: 'Luật 91/2025/QH15 Điều 2 khoản 1; NĐ 356 Điều 3 khoản 11',
    suggestionSource: 'ai',
    coverage: 'REVIEW_REQUIRED',
    action: 'MASK',
    reviewState: 'edited',
    impact: 'Không nằm trong phép join/aggregate mẫu.',
    reason: 'DPO xác nhận email cá nhân cần được che toàn bộ.',
  },
  {
    id: 'order-code',
    path: 'orders.order_code',
    dataType: 'varchar',
    filteredProfile: 'prefix ORD; không match CCCD/phone; distinct cao',
    classification: 'NON_PERSONAL',
    taxonomyLabel: 'Mã nghiệp vụ',
    legalBasis: 'DPO xác nhận theo ngữ cảnh fixture',
    suggestionSource: 'rule',
    coverage: 'REVIEW_REQUIRED',
    action: 'KEEP',
    reviewState: 'accepted',
    impact: 'Cần để Analyst đối chiếu tổng hợp giao dịch.',
    reason: 'Mã đơn không xác định người khi đứng trong snapshot đã bảo vệ.',
  },
  {
    id: 'order-total',
    path: 'orders.total_amount',
    dataType: 'numeric',
    filteredProfile: 'giá trị tiền; phân phối theo nhóm khách hàng; null 0%',
    classification: 'NON_PERSONAL',
    taxonomyLabel: 'Số liệu nghiệp vụ đã tách định danh',
    legalBasis: 'DPO xác nhận trong phạm vi tác vụ aggregate',
    suggestionSource: 'dpo',
    coverage: 'REVIEW_REQUIRED',
    action: 'KEEP',
    reviewState: 'accepted',
    impact: 'Cần cho tổng doanh thu theo nhóm.',
    reason: 'Giữ số tiền sau khi khóa người mua đã được HMAC.',
  },
  {
    id: 'personal-notes',
    path: 'customers.personal_notes',
    dataType: 'text',
    filteredProfile: 'văn bản tự do; rule thấy phone/email token; không gửi nội dung mẫu',
    classification: 'PERSONAL_SENSITIVE',
    taxonomyLabel: 'Thông tin cá nhân trong ghi chú',
    legalBasis: 'Điều 3-4 NĐ 356 theo từng trường nhúng',
    suggestionSource: 'rule',
    coverage: 'UNSUPPORTED',
    action: 'DROP',
    reviewState: 'edited',
    impact: 'Loại khỏi output; báo cáo ghi rõ trường chưa hỗ trợ.',
    reason: 'P0 không nhận diện đầy đủ văn bản tự do.',
  },
  {
    id: 'col-7',
    path: 'orders.col_7',
    dataType: 'text',
    filteredProfile: 'tên cột mơ hồ; distinct vừa; pattern không đủ căn cứ',
    classification: 'UNKNOWN',
    taxonomyLabel: 'Chưa phân loại',
    legalBasis: 'Không đủ căn cứ từ profile đã lọc',
    suggestionSource: 'ai',
    coverage: 'REVIEW_REQUIRED',
    action: 'DROP',
    reviewState: 'edited',
    impact: 'Không nằm trong downstream task; loại an toàn khỏi snapshot.',
    reason: 'Không được KEEP trường UNKNOWN trong demo.',
  },
];

const runBySource = (sourceId: DataSourceKind): ReviewRun => ({
  id: sourceId === 'postgresql' ? 'run-pg-20260925-01' : 'run-mongo-20260925-01',
  sourceId,
  sourceName: sourceId === 'postgresql' ? 'PostgreSQL doanh nghiệp demo' : 'MongoDB order profile demo',
  status: 'REVIEW_REQUIRED',
  startedAt: '2026-09-25T09:12:00+07:00',
  fixtureVersion: sourceId === 'postgresql' ? 'seed.sql#DATA-06-v1' : 'mongo-fixtures#DATA-06-v1',
  policyVersion: 'policy-vn-demo-0.3',
  fields: sourceId === 'postgresql' ? baseFields : baseFields.map((field) => ({ ...field, dataType: field.dataType === 'varchar' ? 'string' : field.dataType })),
});

const report: VerificationReport = {
  datasetId: 'dataset-verified-001',
  runId: 'run-pg-20260925-01',
  status: 'VERIFIED',
  sourceName: 'PostgreSQL doanh nghiệp demo',
  snapshotAt: '2026-09-25T09:26:00+07:00',
  policyVersion: 'policy-vn-demo-0.3',
  verifierChecks: [
    { label: 'Schema allowlist', result: 'passed', detail: 'Không có trường ngoài danh sách đã duyệt.' },
    { label: 'Policy output', result: 'passed', detail: 'MASK/DROP/HMAC/KEEP khớp quyết định DPO.' },
    { label: 'Staging access', result: 'passed', detail: 'Analyst không đọc được vùng staging.' },
    { label: 'UNKNOWN handling', result: 'warning', detail: 'orders.col_7 đã DROP và vẫn ghi là chưa phân loại.' },
  ],
  downstreamMetrics: [
    { label: 'Số hàng join thành công', before: '1.000', after: '1.000', delta: '0' },
    { label: 'Đơn không ghép được', before: '0', after: '0', delta: '0' },
    { label: 'Tổng doanh thu theo nhóm', before: 'khớp baseline', after: 'khớp snapshot', delta: '0%' },
  ],
  warnings: [
    { kind: 'legal', message: 'Kết quả chỉ là kiểm tra trên fixture, không phải chứng nhận tuân thủ.' },
    { kind: 'detection', message: 'Văn bản tự do và object sâu nằm ngoài độ phủ tự động P0.' },
  ],
};

const analystDataset: AnalystDataset = {
  datasetId: 'dataset-verified-001',
  sourceName: 'PostgreSQL doanh nghiệp demo',
  publishedAt: '2026-09-25T09:34:00+07:00',
  allowedTask: 'Tổng doanh thu theo nhóm khách hàng từ snapshot PUBLISHED',
  removedFields: 2,
  previewRows: [
    {
      customer_key: 'hmac:91a4...7f2c',
      customer_segment: 'Retail',
      full_name: '[REDACTED]',
      order_total: '2.450.000',
    },
    {
      customer_key: 'hmac:73c0...1a9e',
      customer_segment: 'SMB',
      full_name: '[REDACTED]',
      order_total: '8.120.000',
    },
  ],
  aggregateRows: [
    { segment: 'Retail', orders: 420, revenue: '856.200.000' },
    { segment: 'SMB', orders: 360, revenue: '1.284.500.000' },
    { segment: 'Enterprise', orders: 220, revenue: '2.040.300.000' },
  ],
};

async function respond<T>(value: T): Promise<T> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, latency);
  });
  return value;
}

export async function fetchDataSources() {
  return respond(dataSourceOptionSchema.array().parse(sources));
}

export async function fetchReviewRun(sourceId: DataSourceKind): Promise<ReviewRun> {
  return respond(reviewRunSchema.parse(runBySource(sourceId)));
}

export async function fetchVerificationReport(): Promise<VerificationReport> {
  return respond(verificationReportSchema.parse(report));
}

export async function fetchAnalystDataset(): Promise<AnalystDataset> {
  return respond(analystDatasetSchema.parse(analystDataset));
}
