import { StatusChip } from '@/shared/ui';
import { getRunStatusLabel, getRunStatusTone, type RunStatus } from '../model/runActions';

export function RunStatusBadge({ status }: { status: RunStatus }): JSX.Element {
  return <StatusChip label={getRunStatusLabel(status)} tone={getRunStatusTone(status)} />;
}
