import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import type { RunSummary } from '../api/runHistoryApi';
import { getRunDeleteBlocker, getRunNextAction, wasRevoked } from '../model/runActions';
import { RunStatusBadge } from './RunStatusBadge';

type RunHistoryRowProps = {
  run: RunSummary;
  selected: boolean;
  disabled: boolean;
  onToggle: (runId: number) => void;
  onDelete: (runId: number) => void;
  onPublish: (run: RunSummary, datasetId: number) => void;
  onRevoke: (run: RunSummary, datasetId: number) => void;
};

export function RunHistoryRow({
  run,
  selected,
  disabled,
  onToggle,
  onDelete,
  onPublish,
  onRevoke,
}: RunHistoryRowProps): JSX.Element {
  const action = getRunNextAction(run);
  const deleteBlocker = getRunDeleteBlocker(run);

  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Tooltip title={deleteBlocker ?? ''}>
          {/* span keeps the tooltip working on a disabled checkbox */}
          <span>
            <Checkbox
              checked={selected}
              disabled={disabled || deleteBlocker !== null}
              onChange={() => onToggle(run.id)}
              inputProps={{ 'aria-label': `Chọn run #${run.id}` }}
            />
          </span>
        </Tooltip>
      </TableCell>
      <TableCell>
        <Link component={RouterLink} to={routes.dpoRun(run.id)} fontWeight={600}>
          #{run.id}
        </Link>
      </TableCell>
      <TableCell>
        {run.source_name}
        <Typography variant="caption" display="block" color="text.secondary">
          {run.engine}
        </Typography>
      </TableCell>
      <TableCell>
        <RunStatusBadge status={run.status} />
        {wasRevoked(run) && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
            Đã thu hồi, cần lưu lại
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        {run.pii_field_count} / {run.field_count}
      </TableCell>
      <TableCell>{run.created_by_username ?? `#${run.created_by}`}</TableCell>
      <TableCell>{formatDateTime(run.updated_at ?? run.created_at)}</TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
          {action.kind === 'publish' && (
            <Button size="small" variant="contained" disabled={disabled} onClick={() => onPublish(run, action.datasetId)}>
              {action.label}
            </Button>
          )}
          {action.kind === 'revoke' && (
            <Button
              size="small"
              variant="contained"
              color="error"
              disabled={disabled}
              onClick={() => onRevoke(run, action.datasetId)}
            >
              {action.label}
            </Button>
          )}
          <Button component={RouterLink} to={routes.dpoRun(run.id)} size="small" variant="text">
            Mở
          </Button>
          <Tooltip title={deleteBlocker ?? 'Xoá run'}>
            <span>
              <IconButton
                size="small"
                color="error"
                aria-label={`Xoá run #${run.id}`}
                disabled={disabled || deleteBlocker !== null}
                onClick={() => onDelete(run.id)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
