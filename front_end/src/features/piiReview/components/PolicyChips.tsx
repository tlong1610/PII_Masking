import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RuleIcon from '@mui/icons-material/Rule';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import {
  type DatasetStatus,
  type PolicyAction,
  type TransformKind,
  type DetectorSource,
  getActionColor,
  getActionLabel,
  getDatasetStatusColor,
  getDatasetStatusLabel,
  getTransformColor,
  getTransformLabel,
  getClassificationLabel,
} from '../model/policyLabels';

/**
 * Databricks-styled action pill for Schema Masking Rule
 */
export function ActionChip({ action }: { action: PolicyAction }): JSX.Element {
  let bgcolor = '#EFF6FF';
  let color = '#1D4ED8';
  let border = '1px solid #BFDBFE';

  if (action === 'DROP') {
    bgcolor = '#FEF2F2';
    color = '#B91C1C';
    border = '1px solid #FECACA';
  } else if (action === 'MASK') {
    bgcolor = '#FFFBEB';
    color = '#B45309';
    border = '1px solid #FDE68A';
  } else if (action === 'HMAC') {
    bgcolor = '#F5F3FF';
    color = '#6D28D9';
    border = '1px solid #DDD6FE';
  } else if (action === 'KEEP') {
    bgcolor = '#F3F4F6';
    color = '#374151';
    border = '1px solid #E5E7EB';
  }

  return (
    <Chip
      label={getActionLabel(action)}
      size="small"
      sx={{
        bgcolor,
        color,
        border,
        fontWeight: 600,
        fontSize: '0.72rem',
        height: 22,
        borderRadius: '4px',
      }}
    />
  );
}

/**
 * Databricks-styled Sensitivity Classification Badge (L3 Sensitive, L2 Basic, Non-PII)
 */
export function SensitivityChip({ classification }: { classification: string }): JSX.Element {
  // NON_PERSONAL also contains "PERSONAL": check it first so it never renders as L2.
  const isNonPii = classification.includes('NON_PERSONAL');
  const isL3 = !isNonPii && classification.includes('SENSITIVE');
  const isL2 =
    !isNonPii && !isL3 && (classification.includes('BASIC') || classification.includes('PERSONAL'));
  const isL1 = classification.includes('QUASI');

  if (isL1) {
    return (
      <Chip
        label="L1 • Gián tiếp"
        size="small"
        color="info"
        variant="outlined"
        sx={{ fontWeight: 600, fontSize: '0.72rem', height: 22, borderRadius: '4px' }}
      />
    );
  }

  if (isL3) {
    return (
      <Chip
        icon={<LockOutlinedIcon sx={{ fontSize: '12px !important', color: '#B91C1C !important' }} />}
        label="L3 • Nhạy cảm"
        size="small"
        sx={{
          bgcolor: '#FEF2F2',
          color: '#B91C1C',
          border: '1px solid #FCA5A5',
          fontWeight: 700,
          fontSize: '0.72rem',
          height: 22,
          borderRadius: '4px',
        }}
      />
    );
  }

  if (isL2) {
    return (
      <Chip
        label="L2 • Cơ bản"
        size="small"
        sx={{
          bgcolor: '#FFFBEB',
          color: '#B45309',
          border: '1px solid #FCD34D',
          fontWeight: 600,
          fontSize: '0.72rem',
          height: 22,
          borderRadius: '4px',
        }}
      />
    );
  }

  if (isNonPii) {
    return (
      <Chip
        label="Non-PII"
        size="small"
        sx={{
          bgcolor: '#F8FAFC',
          color: '#64748B',
          border: '1px solid #E2E8F0',
          fontWeight: 500,
          fontSize: '0.72rem',
          height: 22,
          borderRadius: '4px',
        }}
      />
    );
  }

  return (
    <Chip
      label={getClassificationLabel(classification)}
      size="small"
      sx={{
        bgcolor: '#F3F4F6',
        color: '#4B5563',
        border: '1px solid #E5E7EB',
        fontWeight: 500,
        fontSize: '0.72rem',
        height: 22,
        borderRadius: '4px',
      }}
    />
  );
}

/**
 * Databricks-styled Detector Source Badge (Rule, AI LLM, DPO)
 */
export function DetectorBadge({ source }: { source?: DetectorSource | string }): JSX.Element {
  if (source === 'ai' || source === 'LLM') {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: '#F5F3FF',
          color: '#7C3AED',
          border: '1px solid #DDD6FE',
          px: 0.75,
          py: 0.25,
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 600,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 12 }} />
        Vi-LLM
      </Box>
    );
  }

  if (source === 'dpo') {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE',
          px: 0.75,
          py: 0.25,
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 600,
        }}
      >
        <PersonOutlineIcon sx={{ fontSize: 12 }} />
        DPO Override
      </Box>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: '#F8FAFC',
        color: '#475569',
        border: '1px solid #E2E8F0',
        px: 0.75,
        py: 0.25,
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 600,
      }}
    >
      <RuleIcon sx={{ fontSize: 12 }} />
      Regex Pattern
    </Box>
  );
}

export function DatasetStatusChip({ status }: { status: DatasetStatus }): JSX.Element {
  let bgcolor = '#ECFDF5';
  let color = '#065F46';
  let border = '1px solid #A7F3D0';

  if (status === 'STAGING') {
    bgcolor = '#FFFBEB';
    color = '#92400E';
    border = '1px solid #FDE68A';
  } else if (status === 'FAILED' || status === 'REVOKED') {
    bgcolor = '#FEF2F2';
    color = '#991B1B';
    border = '1px solid #FECACA';
  }

  return (
    <Chip
      label={getDatasetStatusLabel(status)}
      size="small"
      sx={{
        bgcolor,
        color,
        border,
        fontWeight: 600,
        fontSize: '0.72rem',
        height: 22,
        borderRadius: '4px',
      }}
    />
  );
}

export function TransformChip({ transform }: { transform: TransformKind }): JSX.Element {
  return (
    <Chip
      label={getTransformLabel(transform)}
      color={getTransformColor(transform)}
      size="small"
      variant="outlined"
      sx={{
        borderRadius: '4px',
        fontWeight: 600,
        fontSize: '0.72rem',
        height: 22,
      }}
    />
  );
}
