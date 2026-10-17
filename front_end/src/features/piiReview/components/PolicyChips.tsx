import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RuleIcon from '@mui/icons-material/Rule';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import { StatusChip } from '@/shared/ui';
import { type PolicyAction, getActionLabel, getActionTone, getClassificationLabel } from '../model/policyLabels';

/** Protection action pill; same colour as the action picker. */
export function ActionChip({ action }: { action: PolicyAction }): JSX.Element {
  return <StatusChip label={getActionLabel(action)} tone={getActionTone(action)} />;
}

/** Sensitivity level badge: L3 sensitive, L2 basic, L1 indirect, non-personal. */
export function SensitivityChip({ classification }: { classification: string }): JSX.Element {
  // NON_PERSONAL also contains "PERSONAL": check it first so it never renders as L2.
  const isNonPii = classification.includes('NON_PERSONAL');
  const isL1 = classification.includes('QUASI');
  const isL3 = !isNonPii && classification.includes('SENSITIVE');
  const isL2 = !isNonPii && !isL3 && (classification.includes('BASIC') || classification.includes('PERSONAL'));

  if (isL1) return <StatusChip label="L1 • Gián tiếp" tone="info" />;
  if (isL3) return <StatusChip label="L3 • Nhạy cảm" tone="error" icon={<LockOutlinedIcon />} />;
  if (isL2) return <StatusChip label="L2 • Cơ bản" tone="warning" />;
  if (isNonPii) return <StatusChip label="Không phải PII" tone="default" />;
  return <StatusChip label={getClassificationLabel(classification)} tone="default" />;
}

/** Who made the current classification: detection rules, the AI tier, or a DPO override. */
export function DetectorBadge({ source }: { source?: string }): JSX.Element {
  if (source === 'ai' || source === 'LLM') {
    return <StatusChip label="AI" tone="accent" icon={<AutoAwesomeIcon />} />;
  }
  if (source === 'dpo') {
    return <StatusChip label="DPO chỉnh" tone="info" icon={<PersonOutlineIcon />} />;
  }
  return <StatusChip label="Luật nhận diện" tone="default" icon={<RuleIcon />} />;
}
