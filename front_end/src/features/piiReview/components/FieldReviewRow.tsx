import { memo } from 'react';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LinkIcon from '@mui/icons-material/Link';
import type { FieldProfile } from '../api/realPiiReviewApi';
import { getPiiTypeLabel } from '../model/piiTypeLabels';
import type { PolicyAction } from '../model/policyLabels';
import { ActionSelect } from './ActionSelect';
import { ActionChip, DetectorBadge, SensitivityChip } from './PolicyChips';

type FieldReviewRowProps = {
  field: FieldProfile;
  action: PolicyAction;
  editable: boolean;
  highlighted: boolean;
  hasIssue: boolean;
  joinPartnerLabel: string | null;
  // Handlers take the field so the page can pass the same functions to every row (keeps memo effective).
  isActionDisabled: (field: FieldProfile, action: PolicyAction) => boolean;
  getActionOptionNote: (field: FieldProfile, action: PolicyAction) => string;
  onActionChange: (fieldId: number, action: PolicyAction) => void;
  onInspect: (fieldId: number) => void;
};

/** One column of the review table; memoized because large runs have hundreds of rows. */
export const FieldReviewRow = memo(function FieldReviewRow({
  field,
  action,
  editable,
  highlighted,
  hasIssue,
  joinPartnerLabel,
  isActionDisabled,
  getActionOptionNote,
  onActionChange,
  onInspect,
}: FieldReviewRowProps): JSX.Element {
  const flagged = hasIssue || (field.classification.includes('SENSITIVE') && action === 'KEEP');

  return (
    <TableRow
      id={`field-row-${field.id}`}
      hover
      sx={{
        bgcolor: flagged ? 'error.light' : undefined,
        ...(highlighted && { outline: '2px solid', outlineColor: 'error.main', outlineOffset: '-2px' }),
      }}
    >
      <TableCell>
        <Link
          component="button"
          type="button"
          title="Xem chi tiết và lý do"
          onClick={() => onInspect(field.id)}
          underline="hover"
          color="text.primary"
          sx={{ fontFamily: 'monospace', fontWeight: 700, textAlign: 'left', overflowWrap: 'anywhere' }}
        >
          {field.field_path}
        </Link>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace' }}>
          {field.data_type || 'varchar'}
        </Typography>
        {joinPartnerLabel && (
          <Tooltip title="Khóa nối: các đầu nối luôn dùng chung một hành động để Analyst vẫn ghép bảng được">
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25, color: 'info.main' }}>
              <LinkIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>
                Nối với {joinPartnerLabel}
              </Typography>
            </Stack>
          </Tooltip>
        )}
      </TableCell>

      <TableCell>
        <Typography variant="body2">{getPiiTypeLabel(field.taxonomy_id, field.classification)}</Typography>
      </TableCell>

      <TableCell>
        <SensitivityChip classification={field.classification} />
      </TableCell>

      <TableCell>
        <DetectorBadge source={field.detector_source} />
      </TableCell>

      <TableCell>
        {editable ? (
          <ActionSelect
            value={action}
            onChange={(next) => onActionChange(field.id, next)}
            isDisabled={(option) => isActionDisabled(field, option)}
            getNote={(option) => getActionOptionNote(field, option)}
            ariaLabel={`Hành động cho ${field.field_path}`}
          />
        ) : (
          <ActionChip action={action} />
        )}
      </TableCell>

      <TableCell align="right">
        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {field.confidence_score != null ? `${Math.round(field.confidence_score * 100)}%` : '—'}
        </Typography>
      </TableCell>
    </TableRow>
  );
});
