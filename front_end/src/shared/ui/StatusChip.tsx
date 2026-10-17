import type { ReactElement } from 'react';
import Chip from '@mui/material/Chip';
import { alpha, type PaletteColor } from '@mui/material/styles';

export type StatusTone = 'default' | 'info' | 'success' | 'warning' | 'error' | 'accent';

type StatusChipProps = {
  label: string;
  tone: StatusTone;
  icon?: ReactElement;
  title?: string;
};

/**
 * Compact tinted pill (light fill, soft border, dark text). Every status, level and action badge in
 * the app goes through this so they share one size and one look; colour comes from `tone`.
 */
export function StatusChip({ label, tone, icon, title }: StatusChipProps): JSX.Element {
  return (
    <Chip
      label={label}
      icon={icon}
      title={title}
      size="small"
      sx={(theme) => {
        // `accent` only exists in the app theme; fall back to neutral when rendered without it.
        const palette = tone === 'default' ? undefined : (theme.palette[tone] as PaletteColor | undefined);
        const colors = palette
          ? { bg: palette.light, border: alpha(palette.main, 0.35), text: palette.dark }
          : { bg: theme.palette.grey[100], border: theme.palette.grey[300], text: theme.palette.grey[700] };
        return {
          bgcolor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          maxWidth: '100%',
          '& .MuiChip-icon': { color: 'inherit' },
        };
      }}
    />
  );
}
