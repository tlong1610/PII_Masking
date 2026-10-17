import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Mascot, type MascotPose } from '@/shared/ui';

export type SnapshotBannerTone = 'info' | 'warning' | 'error' | 'success';

const POSE: Record<SnapshotBannerTone, MascotPose> = {
  info: 'awaiting',
  warning: 'error',
  error: 'error',
  success: 'protected',
};

type SnapshotStatusBannerProps = {
  tone: SnapshotBannerTone;
  title: string;
  children: string;
};

/** Status of the Analyst-facing data, told by Pango. The text carries the meaning; the mascot is decorative. */
export function SnapshotStatusBanner({ tone, title, children }: SnapshotStatusBannerProps): JSX.Element {
  return (
    <Paper
      variant="outlined"
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      sx={{ p: 2, bgcolor: `${tone}.light`, borderColor: `${tone}.main` }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Mascot pose={POSE[tone]} size={88} />
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700, color: `${tone}.dark` }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.primary">
            {children}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
