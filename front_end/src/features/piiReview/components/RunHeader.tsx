import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UnpublishedOutlinedIcon from '@mui/icons-material/UnpublishedOutlined';
import { RunStatusBadge } from '@/features/runHistory';
import { routes } from '@/shared/config/routes';
import { AppBarSlot } from '@/shared/ui';
import type { Run } from '../api/realPiiReviewApi';
import { getReviewActionLabel, type ReviewAction, type ReviewActions } from '../model/reviewActions';

const ACTION_ICONS: Record<ReviewAction, ReactNode> = {
  BUILD: <SaveOutlinedIcon />,
  PUBLISH: <PublishOutlinedIcon />,
  REVOKE: <UnpublishedOutlinedIcon />,
  RESCAN: <RefreshIcon />,
};

type RunHeaderProps = {
  sourcePicker: ReactNode;
  run: Run | null;
  /** "Nguồn: … · Bảng …" line under the title. */
  subtitle: string;
  actions: ReviewActions;
  /** Label of the action in progress; disables every action while set. */
  busyLabel: string | null;
  primaryDisabled: boolean;
  onAction: (action: ReviewAction) => void;
  onOpenReport: () => void;
};

export function RunHeader({
  sourcePicker,
  run,
  subtitle,
  actions,
  busyLabel,
  primaryDisabled,
  onAction,
  onOpenReport,
}: RunHeaderProps): JSX.Element {
  const busy = busyLabel !== null;
  const spinner = <CircularProgress size={16} color="inherit" />;
  // The busy label goes on the button that started the work: the primary one, or the secondary when alone.
  const busyOnSecondary = busy && actions.primary === null;

  return (
    <Box sx={{ position: 'relative' }}>
      <AppBarSlot>
        <Breadcrumbs sx={{ typography: 'body2', '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}>
          <Link component={RouterLink} to={run ? routes.dpoRuns : routes.dpo} underline="hover" color="text.secondary">
            {run ? 'Lịch sử quét' : 'Quét & duyệt'}
          </Link>
          {sourcePicker}
          {run && (
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
              Run #{run.id}
            </Typography>
          )}
        </Breadcrumbs>
      </AppBarSlot>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              {run ? `Run #${run.id}` : 'Lượt quét mới'}
            </Typography>
            {run && <RunStatusBadge status={run.status} />}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ md: 'flex-end' }}>
          {run && (
            <Button variant="outlined" color="inherit" startIcon={<ArticleOutlinedIcon />} onClick={onOpenReport}>
              Báo cáo tuân thủ
            </Button>
          )}
          {actions.secondary && (
            <Button
              variant="outlined"
              color={actions.secondary === 'REVOKE' ? 'error' : 'primary'}
              startIcon={busyOnSecondary ? spinner : ACTION_ICONS[actions.secondary]}
              disabled={busy}
              onClick={() => actions.secondary && onAction(actions.secondary)}
            >
              {busyOnSecondary ? busyLabel : getReviewActionLabel(actions.secondary)}
            </Button>
          )}
          {actions.primary && (
            <Button
              variant="contained"
              startIcon={busy ? spinner : ACTION_ICONS[actions.primary]}
              disabled={busy || primaryDisabled}
              onClick={() => actions.primary && onAction(actions.primary)}
              sx={{ minWidth: 120 }}
            >
              {busyLabel ?? getReviewActionLabel(actions.primary)}
            </Button>
          )}
        </Stack>
      </Stack>

      {busy && (
        <LinearProgress
          aria-label={busyLabel ?? undefined}
          sx={{ position: 'absolute', left: 0, right: 0, bottom: -12, height: 2, borderRadius: 1 }}
        />
      )}
    </Box>
  );
}
