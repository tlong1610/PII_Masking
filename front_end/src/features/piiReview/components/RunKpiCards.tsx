import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CheckIcon from '@mui/icons-material/Check';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { RiskScoreResult } from '../api/realPiiReviewApi';
import { StatusChip } from '@/shared/ui';
import { type FieldStats, getProtectionPercent } from '../model/fieldStats';

const TIER: Record<RiskScoreResult['tier'], { label: string; color: 'error' | 'warning' | 'info' | 'success' }> = {
  Critical: { label: 'Nghiêm trọng', color: 'error' },
  High: { label: 'Cao', color: 'warning' },
  Medium: { label: 'Trung bình', color: 'info' },
  Low: { label: 'Thấp', color: 'success' },
};

function KpiCard({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="body2" component="h3" color="text.secondary" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {aside}
      </Stack>
      {children}
    </Paper>
  );
}

function BigNumber({ value, unit }: { value: ReactNode; unit?: string }): JSX.Element {
  return (
    <Typography variant="h4" component="p" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
      {value}
      {unit && (
        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5, fontWeight: 400 }}>
          {unit}
        </Typography>
      )}
    </Typography>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }): JSX.Element {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: color }} />
      <Typography variant="caption" color="text.secondary">
        {label} <strong>{value}</strong>
      </Typography>
    </Stack>
  );
}

const LEVELS = [
  { key: 'sensitive', label: 'L3 nhạy cảm', color: 'error.main' },
  { key: 'basic', label: 'L2 cơ bản', color: 'warning.main' },
  { key: 'indirect', label: 'L1 gián tiếp', color: 'info.main' },
  { key: 'other', label: 'Khác', color: 'grey.400' },
] as const;

type RunKpiCardsProps = {
  stats: FieldStats;
  riskScore: RiskScoreResult | null;
  /** Restoring the recommendations is only offered while decisions are editable. */
  canRestoreAi: boolean;
  onRestoreAi: () => void;
};

export function RunKpiCards({ stats, riskScore, canRestoreAi, onRestoreAi }: RunKpiCardsProps): JSX.Element {
  const protection = getProtectionPercent(stats);
  const tier = riskScore ? TIER[riskScore.tier] : null;
  const unprotected = stats.mustProtect - stats.protectedCount;

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
      <KpiCard
        title="Điểm rủi ro"
        aside={tier && <StatusChip label={tier.label} tone={tier.color} />}
      >
        {riskScore && tier ? (
          <>
            <BigNumber value={riskScore.score} unit="/ 100" />
            <LinearProgress
              variant="determinate"
              value={Math.min(100, riskScore.score)}
              color={tier.color}
              sx={{ height: 6 }}
            />
            <Typography variant="caption" color="text.secondary">
              Mức nhạy cảm cao nhất: <strong>{riskScore.max_sensitivity_level}</strong> · {riskScore.action_required}
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Đang tính điểm rủi ro…
          </Typography>
        )}
      </KpiCard>

      <KpiCard title="Cột PII phát hiện">
        <BigNumber value={stats.total} unit="cột" />
        <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: 'action.hover' }}>
          {LEVELS.map(({ key, color }) =>
            stats[key] > 0 ? <Box key={key} sx={{ flexGrow: stats[key], bgcolor: color }} /> : null,
          )}
        </Box>
        <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={1.5} rowGap={0.5}>
          {LEVELS.filter(({ key }) => key !== 'other' || stats.other > 0).map(({ key, label, color }) => (
            <Legend key={key} color={color} label={label} value={stats[key]} />
          ))}
        </Stack>
      </KpiCard>

      <KpiCard title="Tỷ lệ bảo vệ">
        <BigNumber value={protection === null ? '—' : `${protection}%`} />
        <LinearProgress
          variant="determinate"
          value={protection ?? 100}
          color={unprotected > 0 ? 'warning' : 'primary'}
          sx={{ height: 6 }}
        />
        <Typography variant="caption" color="text.secondary">
          {stats.protectedCount}/{stats.mustProtect} cột L2–L3 đã che, băm hoặc loại bỏ · <strong>{unprotected}</strong> cột
          chưa bảo vệ
        </Typography>
      </KpiCard>

      <KpiCard
        title={
          <Stack direction="row" spacing={0.75} alignItems="center" component="span">
            <AutoAwesomeOutlinedIcon fontSize="small" color="primary" />
            <span>Đề xuất của hệ thống</span>
          </Stack>
        }
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Quy tắc che tối thiểu theo Luật 91/2025/QH15 đã áp dụng
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Không cho phép giữ nguyên dữ liệu L3.
        </Typography>
        <Box sx={{ mt: 'auto' }}>
          {stats.overridden === 0 ? (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'success.main' }}>
              <CheckIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Đang theo đề xuất
              </Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'warning.dark' }}>
                <EditOutlinedIcon fontSize="small" />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  DPO đã chỉnh {stats.overridden} cột
                </Typography>
              </Stack>
              {canRestoreAi && (
                <Button size="small" onClick={onRestoreAi}>
                  Khôi phục
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </KpiCard>
    </Box>
  );
}
