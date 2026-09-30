import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import DatasetIcon from '@mui/icons-material/Dataset';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { alpha, type Theme } from '@mui/material/styles';

type GroupTone = 'primary' | 'secondary' | 'info' | 'success' | 'warning';

function getToneMain(theme: Theme, tone: GroupTone): string {
  if (tone === 'primary') return theme.palette.primary.main;
  if (tone === 'secondary') return theme.palette.secondary.main;
  if (tone === 'info') return theme.palette.info.main;
  if (tone === 'success') return theme.palette.success.main;
  return theme.palette.warning.main;
}

type CollapsibleTableGroupProps = {
  children: ReactNode;
  collapsed: boolean;
  colSpan: number;
  countLabel: string;
  onToggle: () => void;
  sourcePath: string;
  summary?: ReactNode;
  tone?: GroupTone;
};

export function CollapsibleTableGroup({
  children,
  collapsed,
  colSpan,
  countLabel,
  onToggle,
  sourcePath,
  summary,
  tone = 'primary',
}: CollapsibleTableGroupProps): JSX.Element {
  return (
    <>
      <TableRow hover onClick={onToggle} sx={{ cursor: 'pointer' }}>
        <TableCell
          colSpan={colSpan}
          sx={{
            bgcolor: (theme) => alpha(getToneMain(theme, tone), 0.08),
            borderLeft: '4px solid',
            borderLeftColor: `${tone}.main`,
            borderBottomColor: 'divider',
            borderTop: '1px solid',
            borderTopColor: 'divider',
            py: 1.25,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {collapsed ? (
                <KeyboardArrowRightIcon color={tone} fontSize="small" />
              ) : (
                <KeyboardArrowDownIcon color={tone} fontSize="small" />
              )}
              <DatasetIcon color={tone} fontSize="small" />
              <Typography variant="subtitle2" fontFamily="monospace">
                {sourcePath}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={countLabel}
                size="small"
                color={tone}
                variant="outlined"
                sx={{
                  bgcolor: (theme) => alpha(getToneMain(theme, tone), 0.08),
                }}
              />
              {summary}
            </Stack>
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={colSpan} sx={{ p: 0, borderBottom: 0 }}>
          <Collapse in={!collapsed} timeout={220} unmountOnExit>
            <Box>
              <Table size="small">
                <TableBody>{children}</TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
