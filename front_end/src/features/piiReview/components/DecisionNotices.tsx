import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { DecisionIssue } from '../model/decisionIssues';
import type { ReviewLock } from '../model/reviewActions';

type DecisionNoticesProps = {
  lock: ReviewLock | null;
  /** Columns changed since the last save of a run that was already saved. */
  unsavedChanges: number;
  error: string | null;
  issues: DecisionIssue[];
  onDismissError: () => void;
  onDismissIssues: () => void;
  onGoToField: (fieldId: number) => void;
};

/** Read-only lock, unsaved edits, and anything that blocks saving. */
export function DecisionNotices({
  lock,
  unsavedChanges,
  error,
  issues,
  onDismissError,
  onDismissIssues,
  onGoToField,
}: DecisionNoticesProps): JSX.Element | null {
  if (!lock && unsavedChanges === 0 && !error && issues.length === 0) return null;

  return (
    <Stack spacing={1.5}>
      {lock && (
        <Paper variant="outlined" sx={{ px: 2, py: 1.25 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ color: 'text.secondary' }}>
            <LockOutlinedIcon fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              <Typography component="span" variant="body2" color="text.primary" sx={{ fontWeight: 700 }}>
                {lock.title}
              </Typography>{' '}
              {lock.message}
            </Typography>
          </Stack>
        </Paper>
      )}

      {unsavedChanges > 0 && (
        <Alert severity="warning">
          {unsavedChanges} cột đã thay đổi so với bản đã lưu. Bấm <strong>Lưu</strong> để cập nhật dữ liệu cho Analyst trước
          khi phát hành.
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={onDismissError} sx={{ whiteSpace: 'pre-line' }}>
          {error}
        </Alert>
      )}

      {issues.length > 0 && (
        <Alert id="decision-issues" severity="error" onClose={onDismissIssues}>
          <AlertTitle>Chưa thể lưu: {issues.length} cột cần sửa</AlertTitle>
          <Stack spacing={0.75}>
            {issues.map((issue, index) => (
              <Stack key={`${issue.fieldId}-${index}`} direction="row" spacing={1} alignItems="center">
                <Button size="small" color="error" variant="outlined" onClick={() => onGoToField(issue.fieldId)}>
                  Đi tới
                </Button>
                <Typography variant="body2">
                  <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {issue.fieldLabel}
                  </Typography>
                  : {issue.message}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
