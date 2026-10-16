import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { SourceScope } from '../api/realPiiReviewApi';
import type { ScopeLinkAnalysis } from '../model/scopeLinks';
import { ScopeLinkWarnings } from './ScopeLinkWarnings';
import { SourceScopePickerDiagram } from './SourceScopePickerDiagram';

type ScopeSelectionStepProps = {
  scope: SourceScope;
  selected: string[];
  linkTables: string[];
  analysis: ScopeLinkAnalysis;
  scanning: boolean;
  onToggle: (name: string) => void;
  onSelectAll: () => void;
  onAddLink: (table: string) => void;
  onRemoveLink: (table: string) => void;
  onScan: () => void;
};

/** Step 1: choose which tables end up in the snapshot, then start the scan. */
export function ScopeSelectionStep({
  scope,
  selected,
  linkTables,
  analysis,
  scanning,
  onToggle,
  onSelectAll,
  onAddLink,
  onRemoveLink,
  onScan,
}: ScopeSelectionStepProps): JSX.Element {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <div>
            <Typography variant="subtitle1" fontWeight={700}>
              Chọn phạm vi quét
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đã chọn {selected.length}/{scope.items.length} bảng
              {linkTables.length > 0 ? ` • ${linkTables.length} bảng liên kết` : ''}. Chỉ các bảng này mới được phát
              hành cho Analyst.
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={scanning ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            onClick={onScan}
            disabled={scanning || selected.length === 0}
            sx={{ flexShrink: 0, minWidth: 180 }}
          >
            {scanning ? 'Đang quét…' : 'Bắt đầu quét'}
          </Button>
        </Stack>
      </Paper>
      <ScopeLinkWarnings analysis={analysis} linkTables={linkTables} onAddLink={onAddLink} onRemoveLink={onRemoveLink} />
      <SourceScopePickerDiagram
        items={scope.items}
        selectedNames={selected}
        relationships={scope.relationships}
        onToggle={onToggle}
        onSelectAll={onSelectAll}
      />
    </Stack>
  );
}
