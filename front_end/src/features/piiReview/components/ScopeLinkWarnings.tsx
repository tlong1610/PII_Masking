import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ScopeLinkAnalysis, ScopeLinkGap } from '../model/scopeLinks';

interface ScopeLinkWarningsProps {
  analysis: ScopeLinkAnalysis;
  linkTables: string[];
  onAddLink: (table: string) => void;
  onRemoveLink: (table: string) => void;
}

const tableList = (tables: string[]): string => tables.join(', ');

function GapAlert({
  gap,
  message,
  onAddLink,
}: {
  gap: ScopeLinkGap;
  message: string;
  onAddLink: (table: string) => void;
}): JSX.Element {
  return (
    <Alert
      severity="warning"
      action={
        <Button color="inherit" size="small" onClick={() => onAddLink(gap.table)}>
          Thêm dạng bảng liên kết
        </Button>
      }
    >
      {message}
    </Alert>
  );
}

/**
 * Joins cut by the current selection. Adding a link-only table keeps the join for the Analyst:
 * only its join keys are kept (HMAC), every other field defaults to DROP.
 */
export function ScopeLinkWarnings({
  analysis,
  linkTables,
  onAddLink,
  onRemoveLink,
}: ScopeLinkWarningsProps): JSX.Element | null {
  const { missingParents, missingBridges, missingChildren } = analysis;
  if (!missingParents.length && !missingBridges.length && !missingChildren.length && !linkTables.length) {
    return null;
  }

  return (
    <Stack spacing={1} aria-live="polite">
      {missingBridges.map((gap) => (
        <GapAlert
          key={`bridge-${gap.table}`}
          gap={gap}
          onAddLink={onAddLink}
          message={`Mất liên kết N–N giữa ${tableList(gap.connects)}: bảng trung gian ${gap.table} chưa được chọn.`}
        />
      ))}
      {missingParents.map((gap) => (
        <GapAlert
          key={`parent-${gap.table}`}
          gap={gap}
          onAddLink={onAddLink}
          message={`Thiếu bảng cha ${gap.table}: khóa ngoại của ${tableList(gap.connects)} sẽ không JOIN được.`}
        />
      ))}
      {missingChildren.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Bảng con không chọn (không ảnh hưởng JOIN): {tableList(missingChildren)}
        </Typography>
      )}
      {linkTables.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary">
            Bảng liên kết (chỉ giữ khóa nối dạng HMAC):
          </Typography>
          {linkTables.map((table) => (
            <Chip key={table} label={table} size="small" color="info" onDelete={() => onRemoveLink(table)} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
