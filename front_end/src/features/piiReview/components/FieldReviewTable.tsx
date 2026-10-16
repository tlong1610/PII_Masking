import { Fragment } from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import type { FieldProfile } from '../api/realPiiReviewApi';
import type { PolicyAction } from '../model/policyLabels';
import { FieldReviewRow } from './FieldReviewRow';

const COLUMNS = [
  { label: 'Cột', width: '22%' },
  { label: 'Loại PII', width: '15%' },
  { label: 'Mức', width: '13%' },
  { label: 'Nguồn nhận diện', width: '14%' },
  { label: 'Hành động', width: '24%' },
  { label: 'Độ tin cậy AI', width: '12%', align: 'right' as const },
];

export interface FieldGroup {
  sourcePath: string;
  fields: FieldProfile[];
}

type FieldReviewTableProps = {
  groups: FieldGroup[];
  collapsed: Record<string, boolean>;
  onToggleGroup: (sourcePath: string) => void;
  editable: boolean;
  highlightFieldId: number | null;
  issueFieldIds: Set<number>;
  getAction: (field: FieldProfile) => PolicyAction;
  getJoinPartnerLabel: (fieldId: number) => string | null;
  isActionDisabled: (field: FieldProfile, action: PolicyAction) => boolean;
  getActionOptionNote: (field: FieldProfile, action: PolicyAction) => string;
  onActionChange: (fieldId: number, action: PolicyAction) => void;
  onInspect: (fieldId: number) => void;
};

/** One table of columns; a header row per source table appears only when the run spans several tables. */
export function FieldReviewTable({
  groups,
  collapsed,
  onToggleGroup,
  editable,
  highlightFieldId,
  issueFieldIds,
  getAction,
  getJoinPartnerLabel,
  isActionDisabled,
  getActionOptionNote,
  onActionChange,
  onInspect,
}: FieldReviewTableProps): JSX.Element {
  const showGroups = groups.length > 1;

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 860 }}>
        <colgroup>
          {COLUMNS.map((column) => (
            <col key={column.label} style={{ width: column.width }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableCell
                key={column.label}
                align={column.align}
                sx={{ typography: 'overline', lineHeight: 1.5, color: 'text.secondary', fontWeight: 700 }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((group) => {
            const isCollapsed = showGroups && Boolean(collapsed[group.sourcePath]);
            return (
              <Fragment key={group.sourcePath}>
                {showGroups && (
                  <TableRow
                    hover
                    onClick={() => onToggleGroup(group.sourcePath)}
                    sx={{ cursor: 'pointer', bgcolor: 'background.default' }}
                    aria-expanded={!isCollapsed}
                  >
                    <TableCell colSpan={COLUMNS.length} sx={{ py: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {isCollapsed ? (
                          <KeyboardArrowRightIcon fontSize="small" color="action" />
                        ) : (
                          <KeyboardArrowDownIcon fontSize="small" color="primary" />
                        )}
                        <TableChartOutlinedIcon fontSize="small" color="primary" />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {group.sourcePath}
                        </Typography>
                        <Chip size="small" variant="outlined" label={`${group.fields.length} cột`} />
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {!isCollapsed &&
                  group.fields.map((field) => (
                    <FieldReviewRow
                      key={field.id}
                      field={field}
                      action={getAction(field)}
                      editable={editable}
                      highlighted={highlightFieldId === field.id}
                      hasIssue={issueFieldIds.has(field.id)}
                      joinPartnerLabel={getJoinPartnerLabel(field.id)}
                      isActionDisabled={isActionDisabled}
                      getActionOptionNote={getActionOptionNote}
                      onActionChange={onActionChange}
                      onInspect={onInspect}
                    />
                  ))}
              </Fragment>
            );
          })}
          {groups.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS.length}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  Không có cột nào khớp bộ lọc.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
