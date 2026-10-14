import type { FieldDecisionNote } from './fieldDecision';
import type { PolicyAction } from './policyLabels';

export interface SavedFieldDecision {
  field_profile_id: number;
  action: PolicyAction;
  reason: string;
  is_exception?: boolean;
  exception_until?: string | null;
}

/**
 * Rebuilds the review state from decisions already stored on a run, so reopening a run
 * shows (and re-submits) what the DPO saved instead of the scanner's recommendations.
 */
export function restoreSavedDecisions(decisions: SavedFieldDecision[]): {
  overrides: Record<number, PolicyAction>;
  notes: Record<number, FieldDecisionNote>;
} {
  const overrides: Record<number, PolicyAction> = {};
  const notes: Record<number, FieldDecisionNote> = {};
  for (const decision of decisions) {
    overrides[decision.field_profile_id] = decision.action;
    notes[decision.field_profile_id] = {
      reason: decision.reason,
      notPersonal: false,
      exceptionUntil: decision.is_exception && decision.exception_until ? decision.exception_until.slice(0, 10) : '',
    };
  }
  return { overrides, notes };
}

/** Latest dataset built from a run (highest id), or null when the run was never built. */
export function getLatestDataset<T extends { id: number }>(datasets: T[]): T | null {
  return datasets.reduce<T | null>((latest, item) => (latest === null || item.id > latest.id ? item : latest), null);
}
