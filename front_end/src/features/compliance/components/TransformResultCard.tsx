import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type TransformTone = 'error' | 'primary' | 'success' | 'neutral';

type TransformResultCardProps = {
  tone: TransformTone;
  title: string;
  badge: string;
  /** The transformed value; rendered in a monospace well of fixed height so the 4 cards line up. */
  value: ReactNode;
  action?: ReactNode;
  note: string;
};

const PALETTE: Record<TransformTone, { border: string; bg: string; text: string }> = {
  error: { border: 'error.main', bg: 'error.light', text: 'error.dark' },
  primary: { border: 'primary.main', bg: 'primary.light', text: 'primary.dark' },
  success: { border: 'success.main', bg: 'success.light', text: 'success.dark' },
  neutral: { border: 'divider', bg: 'background.default', text: 'text.secondary' },
};

/** One result of the live sandbox (RAW / MASK / HMAC / DROP), all four sharing one layout. */
export function TransformResultCard({ tone, title, badge, value, action, note }: TransformResultCardProps): JSX.Element {
  const colors = PALETTE[tone];
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, borderColor: colors.border, bgcolor: colors.bg }}
    >
      <Stack spacing={0.75} alignItems="flex-start">
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700, color: colors.text }}>
          {title}
        </Typography>
        <Chip
          label={badge}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontWeight: 600, color: colors.text, borderColor: colors.border, bgcolor: 'background.paper' }}
        />
      </Stack>
      <Box
        sx={{
          minHeight: 56,
          px: 1.5,
          py: 1,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Typography
          variant="body2"
          component="div"
          sx={{ flex: 1, minWidth: 0, fontFamily: 'monospace', fontWeight: 600, color: colors.text, overflowWrap: 'anywhere' }}
        >
          {value}
        </Typography>
        {action}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {note}
      </Typography>
    </Paper>
  );
}
