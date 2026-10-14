import { z } from 'zod';
import { apiRequest } from '@/shared/api/client';
import { RUN_STATUSES, type RunStatus } from '../model/runActions';

export const runSummarySchema = z.object({
  id: z.number(),
  source_id: z.string(),
  source_type: z.enum(['SQL', 'NOSQL']),
  source_name: z.string(),
  engine: z.string(),
  status: z.enum(RUN_STATUSES),
  created_by: z.number(),
  created_by_username: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  field_count: z.number(),
  pii_field_count: z.number(),
  decided_count: z.number(),
  latest_dataset_id: z.number().nullable().optional(),
  latest_dataset_status: z.string().nullable().optional(),
});

export type RunSummary = z.infer<typeof runSummarySchema>;

export async function fetchRunHistory(status?: RunStatus): Promise<RunSummary[]> {
  const query = status ? `?status=${status}` : '';
  return z.array(runSummarySchema).parse(await apiRequest<unknown>(`/runs${query}`));
}

export async function deleteRun(runId: number): Promise<void> {
  await apiRequest<void>(`/runs/${runId}`, { method: 'DELETE' });
}
