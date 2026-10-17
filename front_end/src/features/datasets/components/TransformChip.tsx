import { StatusChip } from '@/shared/ui';
import { getTransformLabel, getTransformTone } from '../model/transformLabels';
import type { TransformKind } from '../model/types';

export function TransformChip({ transform }: { transform: TransformKind }): JSX.Element {
  return <StatusChip label={getTransformLabel(transform)} tone={getTransformTone(transform)} />;
}
