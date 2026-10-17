import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type SectionHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  /** Badge shown next to the title, e.g. the run status. */
  status?: ReactNode;
  /** Page-level buttons, right-aligned on wide screens and wrapped below the title on phones. */
  actions?: ReactNode;
};

/** The one page header used across the DPO workspace: eyebrow, title (+status), description, actions. */
export function SectionHeader({ eyebrow, title, description, status, actions }: SectionHeaderProps): JSX.Element {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'flex-end' }}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0, maxWidth: 820 }}>
        {eyebrow ? (
          <Typography variant="overline" color="primary">
            {eyebrow}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="h3" component="h1" color="text.primary">
            {title}
          </Typography>
          {status}
        </Stack>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Stack>
      {actions ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ flexShrink: 0 }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}
