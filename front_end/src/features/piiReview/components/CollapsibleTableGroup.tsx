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
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

type GroupTone = 'primary' | 'secondary' | 'info' | 'success' | 'warning';

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
}: CollapsibleTableGroupProps): JSX.Element {
  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{
          cursor: 'pointer',
          bgcolor: '#F9FAFB',
          '&:hover': { bgcolor: '#F3F4F6' },
        }}
      >
        <TableCell
          colSpan={colSpan}
          sx={{
            py: 1,
            px: 1.5,
            borderTop: '1px solid #E5E7EB',
            borderBottom: '1px solid #E5E7EB',
            borderLeft: '3px solid #1B51A4',
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
                <KeyboardArrowRightIcon sx={{ color: '#6B7280', fontSize: 18 }} />
              ) : (
                <KeyboardArrowDownIcon sx={{ color: '#1B51A4', fontSize: 18 }} />
              )}
              <TableChartOutlinedIcon sx={{ color: '#1B51A4', fontSize: 18 }} />
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {sourcePath}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip
                label={countLabel}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  color: '#374151',
                  borderRadius: '4px',
                }}
              />
              {summary}
            </Stack>
          </Stack>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={colSpan} sx={{ p: 0, borderBottom: 0 }}>
          <Collapse in={!collapsed} timeout={180} unmountOnExit>
            <Box sx={{ bgcolor: '#FFFFFF' }}>
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
