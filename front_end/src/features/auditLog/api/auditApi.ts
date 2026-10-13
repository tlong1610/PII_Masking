import { z } from 'zod';
import { apiRequest } from '@/shared/api/client';

export const auditEventSchema = z.object({
  id: z.number(),
  actor_id: z.number(),
  actor_username: z.string().nullable().optional(),
  role: z.string(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  reason: z.string(),
  created_at: z.string(),
  prev_hash: z.string(),
  entry_hash: z.string(),
});

export const auditChainSchema = z.object({
  valid: z.boolean(),
  total_events: z.number(),
  head_hash: z.string().nullable().optional(),
  broken_at_id: z.number().nullable().optional(),
  error: z.string().nullable().optional(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;
export type AuditChainStatus = z.infer<typeof auditChainSchema>;

export interface AuditFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  limit: number;
}

export async function fetchAuditEvents(filters: AuditFilters): Promise<AuditEvent[]> {
  const params = new URLSearchParams({ limit: String(filters.limit) });
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entity_type', filters.entityType);
  if (filters.entityId) params.set('entity_id', filters.entityId);
  return z.array(auditEventSchema).parse(await apiRequest<unknown>(`/audit?${params.toString()}`));
}

export async function verifyAuditChain(): Promise<AuditChainStatus> {
  return auditChainSchema.parse(await apiRequest<unknown>('/audit/verify'));
}
