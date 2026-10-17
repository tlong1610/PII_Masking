import Chip from '@mui/material/Chip';

export type StatusTone = 'default' | 'info' | 'success' | 'warning' | 'error';

type StatusChipProps = {
  label: string;
  tone: StatusTone;
};

/** Compact outlined status pill; colour comes from the theme palette via `tone`. */
export function StatusChip({ label, tone }: StatusChipProps): JSX.Element {
  return <Chip label={label} color={tone} size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
}
