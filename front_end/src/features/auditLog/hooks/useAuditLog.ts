import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAuditEvents, verifyAuditChain, type AuditFilters } from '../api/auditApi';

export const auditQueryKeys = {
  events: (filters: AuditFilters) => ['audit', 'events', filters] as const,
  chain: ['audit', 'chain'] as const,
};

export function useAuditEvents(filters: AuditFilters) {
  return useQuery({
    queryKey: auditQueryKeys.events(filters),
    queryFn: () => fetchAuditEvents(filters),
    // "Load more" raises the limit; keep the current rows on screen while the next page loads.
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useAuditChainStatus() {
  return useQuery({ queryKey: auditQueryKeys.chain, queryFn: verifyAuditChain, staleTime: 0 });
}
