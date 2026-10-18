import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Mascot, type MascotPose } from './Mascot';

type MascotLoaderProps = {
  pose?: Extract<MascotPose, 'loading' | 'scanning'>;
  title: string;
  description?: string;
  size?: number;
  /** Smaller Pango and less padding, for loading inside a card, tab or table section. */
  compact?: boolean;
};

/** Busy state with Pango: announces the title politely so screen readers hear what is happening. */
export function MascotLoader({
  pose = 'loading',
  title,
  description,
  size,
  compact = false,
}: MascotLoaderProps): JSX.Element {
  return (
    <Stack
      role="status"
      aria-live="polite"
      alignItems="center"
      spacing={1.5}
      sx={{ py: compact ? 3 : { xs: 5, md: 8 }, px: 2, textAlign: 'center' }}
    >
      <Mascot pose={pose} size={size ?? (compact ? 72 : 140)} float />
      <Typography variant={compact ? 'body1' : 'h6'} component="p" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
          {description}
        </Typography>
      ) : null}
      <LinearProgress aria-hidden sx={{ width: 160, borderRadius: 1, mt: 1 }} />
    </Stack>
  );
}
