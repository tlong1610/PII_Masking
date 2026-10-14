export const routes = {
  login: '/login',
  dpo: '/dpo',
  dpoRuns: '/dpo/runs',
  dpoRun: (runId: number): string => `/dpo/runs/${runId}`,
  dpoDatasets: '/dpo/datasets',
  dpoDataset: (datasetId: number): string => `/dpo/datasets/${datasetId}`,
  dpoAudit: '/dpo/audit',
  dpoRules: '/dpo/rules',
  analyst: '/analyst',
} as const;
