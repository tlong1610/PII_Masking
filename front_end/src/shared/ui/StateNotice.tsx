import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

type StateNoticeProps = {
  kind: 'empty' | 'error';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StateNotice({
  kind,
  title,
  description,
  actionLabel,
  onAction,
}: StateNoticeProps): JSX.Element {
  const Icon = kind === 'error' ? ErrorOutlineIcon : InboxOutlinedIcon;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 3, md: 4 },
        minHeight: 280,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 520 }}>
        <Icon color={kind === 'error' ? 'error' : 'primary'} sx={{ fontSize: 48 }} />
        <Typography variant="h3">{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
        {actionLabel && onAction ? (
          <Button variant="contained" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
