import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import type { StatusTone } from '@/shared/ui';
import { POLICY_ACTIONS, getActionLabel, getActionTone, type PolicyAction } from '../model/policyLabels';

type ActionSelectProps = {
  value: PolicyAction;
  onChange: (action: PolicyAction) => void;
  isDisabled: (action: PolicyAction) => boolean;
  /** Short hint after the label, e.g. "(khóa nối)" or "(đề xuất)"; empty for none. */
  getNote: (action: PolicyAction) => string;
  ariaLabel: string;
  id?: string;
};

function ActionDot({ tone }: { tone: StatusTone }): JSX.Element {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: 8,
        height: 8,
        flexShrink: 0,
        borderRadius: '50%',
        bgcolor: tone === 'default' ? 'grey.400' : `${tone}.main`,
      }}
    />
  );
}

/** Protection action picker: a colour dot per action, same colours as the action chips. */
export function ActionSelect({ value, onChange, isDisabled, getNote, ariaLabel, id }: ActionSelectProps): JSX.Element {
  return (
    <Select<PolicyAction>
      id={id}
      size="small"
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value as PolicyAction)}
      inputProps={{ 'aria-label': ariaLabel }}
      renderValue={(selected) => (
        <>
          <ActionDot tone={getActionTone(selected)} />
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getActionLabel(selected)}
          </Box>
        </>
      )}
    >
      {POLICY_ACTIONS.map((action) => {
        const note = getNote(action).trim();
        return (
          <MenuItem key={action} value={action} disabled={isDisabled(action)}>
            <ActionDot tone={getActionTone(action)} />
            <Box component="span" sx={{ flexGrow: 1 }}>
              {getActionLabel(action)}
            </Box>
            {note && (
              <Typography component="span" variant="caption" color="text.secondary">
                {note}
              </Typography>
            )}
          </MenuItem>
        );
      })}
    </Select>
  );
}
