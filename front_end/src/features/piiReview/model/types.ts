export type DataSourceKind = 'postgresql' | 'mongodb';
export type RunStatus =
  | 'NEW'
  | 'SCANNING'
  | 'REVIEW_REQUIRED'
  | 'READY_TO_BUILD'
  | 'BUILDING'
  | 'VERIFIED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'REVOKED';
export type Classification = 'PERSONAL_BASIC' | 'PERSONAL_SENSITIVE' | 'NON_PERSONAL' | 'UNKNOWN';
export type DetectionCoverage = 'AUTO_SUPPORTED' | 'REVIEW_REQUIRED' | 'UNSUPPORTED';
export type FieldAction = 'DROP' | 'MASK' | 'HMAC' | 'KEEP';
export type ReviewState = 'accepted' | 'edited' | 'rejected' | 'pending';

export type DataSourceOption = {
  id: DataSourceKind;
  name: string;
  engineLabel: string;
  connectionState: 'verified' | 'warning';
  scopeLabel: string;
  fieldCount: number;
  recordCount: number;
  unsupportedSummary: string;
  downstreamTask: string;
};

export type ReviewField = {
  id: string;
  path: string;
  dataType: string;
  filteredProfile: string;
  classification: Classification;
  taxonomyLabel: string;
  legalBasis: string;
  suggestionSource: 'rule' | 'ai' | 'dpo' | 'none';
  coverage: DetectionCoverage;
  action: FieldAction;
  reviewState: ReviewState;
  impact: string;
  reason: string;
};

export type ReviewRun = {
  id: string;
  sourceId: DataSourceKind;
  sourceName: string;
  status: RunStatus;
  startedAt: string;
  fixtureVersion: string;
  policyVersion: string;
  fields: ReviewField[];
};

export type ReviewSummary = {
  total: number;
  decided: number;
  pending: number;
  unknownDropped: number;
  mask: number;
  drop: number;
  hmac: number;
  keep: number;
};

export type VerificationReport = {
  datasetId: string;
  runId: string;
  status: 'VERIFIED' | 'PUBLISHED' | 'REVOKED';
  sourceName: string;
  snapshotAt: string;
  policyVersion: string;
  verifierChecks: Array<{ label: string; result: 'passed' | 'warning'; detail: string }>;
  downstreamMetrics: Array<{ label: string; before: string; after: string; delta: string }>;
  warnings: Array<{ kind: 'blocking' | 'legal' | 'detection'; message: string }>;
};

export type AnalystDataset = {
  datasetId: string;
  sourceName: string;
  publishedAt: string;
  allowedTask: string;
  removedFields: number;
  previewRows: Array<Record<string, string>>;
  aggregateRows: Array<{ segment: string; orders: number; revenue: string }>;
};
