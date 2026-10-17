import { useMemo, useState, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import type { Source } from '../api/realPiiReviewApi';
import { isUserSource } from '../model/sourceForm';
import { DatabaseIcon } from './DatabaseIcon';

type SourcePickerProps = {
  sources: Source[];
  selectedId: string | null;
  /** Switching source is only allowed before a scan; an open run belongs to its source. */
  disabled?: boolean;
  deleting?: boolean;
  onSelect: (sourceId: string) => void;
  onDelete: (sourceId: string) => void;
  onAdd: () => void;
  onRefresh: () => void;
};

/** Source selector in the page header: a searchable popover instead of a collapsible side panel. */
export function SourcePicker({
  sources,
  selectedId,
  disabled = false,
  deleting = false,
  onSelect,
  onDelete,
  onAdd,
  onRefresh,
}: SourcePickerProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const selected = sources.find((source) => source.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sources;
    return sources.filter(
      (source) => source.name.toLowerCase().includes(term) || source.source_type.toLowerCase().includes(term),
    );
  }, [search, sources]);

  const close = (): void => {
    setAnchor(null);
    setSearch('');
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        disabled={disabled}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        startIcon={<DatabaseIcon fontSize="small" color="primary" />}
        endIcon={disabled ? undefined : <ExpandMoreIcon fontSize="small" />}
        aria-haspopup="dialog"
        aria-label={selected ? `Nguồn dữ liệu: ${selected.name}` : 'Chọn nguồn dữ liệu'}
        sx={{
          borderColor: 'divider',
          bgcolor: 'background.paper',
          fontWeight: 600,
          maxWidth: 360,
          justifyContent: 'flex-start',
          '&.Mui-disabled': { color: 'text.primary', borderColor: 'divider' },
        }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : 'Chọn nguồn dữ liệu'}
        </Box>
      </Button>

      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 360, mt: 1 } } }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Nguồn dữ liệu
          </Typography>
          <Tooltip title="Làm mới">
            <IconButton size="small" onClick={onRefresh} aria-label="Làm mới danh sách nguồn">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Box sx={{ px: 2, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="Tìm nguồn dữ liệu…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <List dense sx={{ maxHeight: 360, overflowY: 'auto', py: 0 }}>
          {filtered.map((source) => (
            <ListItemButton
              key={source.id}
              selected={source.id === selectedId}
              onClick={() => {
                onSelect(source.id);
                close();
              }}
              sx={{ pr: isUserSource(source.id) ? 6 : 2, position: 'relative' }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {source.id === selectedId ? <CheckIcon fontSize="small" color="primary" /> : null}
              </ListItemIcon>
              <ListItemText
                primary={source.name}
                secondary={`${source.source_type} • ${source.scope_summary}`}
                primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
              />
              {isUserSource(source.id) && (
                <Tooltip title="Xóa nguồn">
                  <IconButton
                    size="small"
                    edge="end"
                    disabled={deleting}
                    aria-label={`Xóa nguồn ${source.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(source.id);
                    }}
                    sx={{ position: 'absolute', right: 8, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemButton>
          ))}
          {filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
              Không tìm thấy nguồn phù hợp.
            </Typography>
          )}
        </List>
        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              close();
              onAdd();
            }}
          >
            Thêm cơ sở dữ liệu
          </Button>
        </Box>
      </Popover>
    </>
  );
}
