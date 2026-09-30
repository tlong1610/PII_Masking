import Chip from '@mui/material/Chip';

import {
  type DatasetStatus,
  type PolicyAction,
  type TransformKind,
  getActionColor,
  getActionLabel,
  getDatasetStatusColor,
  getDatasetStatusLabel,
  getTransformColor,
  getTransformLabel,
} from '../model/policyLabels';

export function ActionChip({ action }: { action: PolicyAction }): JSX.Element {
  return <Chip label={getActionLabel(action)} color={getActionColor(action)} size="small" />;
}

export function DatasetStatusChip({ status }: { status: DatasetStatus }): JSX.Element {
  return (
    <Chip label={getDatasetStatusLabel(status)} color={getDatasetStatusColor(status)} size="small" />
  );
}

export function TransformChip({ transform }: { transform: TransformKind }): JSX.Element {
  return (
    <Chip
      label={getTransformLabel(transform)}
      color={getTransformColor(transform)}
      size="small"
      variant="outlined"
    />
  );
}
