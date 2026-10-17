import { StatusChip } from '@/shared/ui';
import { getDatasetStatusLabel, getDatasetStatusTone } from '../model/datasetRules';
import type { DatasetStatus } from '../model/types';

export function DatasetStatusBadge({ status }: { status: DatasetStatus }): JSX.Element {
  return <StatusChip label={getDatasetStatusLabel(status)} tone={getDatasetStatusTone(status)} />;
}
