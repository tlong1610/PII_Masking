export const routes = {
  login: '/login',
  dpo: '/dpo',
  dpoRuns: '/dpo/runs',
  dpoRun: (runId: number): string => `/dpo/runs/${runId}`,
  dpoAudit: '/dpo/audit',
  dpoMasking: '/dpo/masking',
  dpoRules: '/dpo/rules',
  analyst: '/analyst',
} as const;
