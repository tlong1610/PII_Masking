import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import { POLICY_ACTIONS, getActionLabel, type PolicyAction } from '../model/policyLabels';

export type ActionFilter = PolicyAction | 'ALL';

type ReviewToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: ActionFilter;
  onFilterChange: (filter: ActionFilter) => void;
  totalCount: number;
  actionCounts: Record<PolicyAction, number>;
};

function FilterLabel({ label, count }: { label: string; count: number }): JSX.Element {
  return (
    <span>
      {label}
      <Box component="span" sx={{ ml: 0.75, opacity: 0.7 }}>
        {count}
      </Box>
    </span>
  );
}

/** Header of the column card: title, column search, and filter by action. */
export function ReviewToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  totalCount,
  actionCounts,
}: ReviewToolbarProps): JSX.Element {
  const filters: { value: ActionFilter; label: string; count: number }[] = [
    { value: 'ALL', label: 'Tất cả', count: totalCount },
    ...POLICY_ACTIONS.map((action) => ({ value: action, label: getActionLabel(action), count: actionCounts[action] })),
  ];

  return (
    <Stack spacing={1.5} sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Phân loại cột &amp; hành động
        </Typography>
        <TextField
          size="small"
          placeholder="Lọc cột…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          sx={{ width: { xs: '100%', sm: 240 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          inputProps={{ 'aria-label': 'Lọc cột' }}
        />
      </Stack>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {filters.map(({ value, label, count }) => (
          <Chip
            key={value}
            label={<FilterLabel label={label} count={count} />}
            size="small"
            clickable
            color={filter === value ? 'primary' : 'default'}
            variant={filter === value ? 'filled' : 'outlined'}
            onClick={() => onFilterChange(value)}
            aria-pressed={filter === value}
            sx={{ fontWeight: 600, opacity: count === 0 && filter !== value ? 0.6 : 1 }}
          />
        ))}
      </Stack>
    </Stack>
  );
}
