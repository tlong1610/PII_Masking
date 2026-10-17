import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import type { RiskScoreResult } from '../api/realPiiReviewApi';
import { POLICY_ACTIONS, type PolicyAction } from '../model/policyLabels';
import type { ProtectionRate } from '../model/protectionRates';
import { ActionChip } from './PolicyChips';

const TIER_SEVERITY = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'success' } as const;
const TIER_LABELS = { Critical: 'Nghiêm trọng', High: 'Cao', Medium: 'Trung bình', Low: 'Thấp' } as const;

type RiskInsightsTabProps = {
  riskScore: RiskScoreResult | null;
  protectionRates: { sensitive: ProtectionRate; basic: ProtectionRate };
  actionCounts: Record<PolicyAction, number>;
  fieldCount: number;
};

export function RiskInsightsTab({ riskScore, protectionRates, actionCounts, fieldCount }: RiskInsightsTabProps): JSX.Element {
  return (
    <Stack spacing={3}>
      {riskScore && (
        <Alert severity={TIER_SEVERITY[riskScore.tier]} icon={<ShieldOutlinedIcon />} variant="outlined">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Điểm rủi ro {riskScore.score}/100 — mức {TIER_LABELS[riskScore.tier]} ({riskScore.action_required})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Mức nhạy cảm cao nhất: <strong>{riskScore.max_sensitivity_level}</strong> • Cột chưa bảo vệ:{' '}
            <strong>
              {riskScore.drivers.unmasked_pii_fields}/{riskScore.drivers.total_pii_fields}
            </strong>{' '}
            • Tỷ lệ bảo vệ: <strong>{riskScore.drivers.protection_pct}%</strong>
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Mức bảo vệ theo quyết định hiện tại
            </Typography>
            <Stack spacing={2}>
              {[
                { label: 'Dữ liệu nhạy cảm (L3)', rate: protectionRates.sensitive },
                { label: 'Dữ liệu cơ bản (L2)', rate: protectionRates.basic },
              ].map(({ label, rate }) => (
                <Box key={label}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2">{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {rate.percent === null ? 'Không có cột' : `${rate.percent}% (${rate.protectedCount}/${rate.total} cột)`}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={rate.percent ?? 100}
                    color={rate.percent === null || rate.percent === 100 ? 'success' : 'warning'}
                    sx={{ height: 6 }}
                  />
                </Box>
              ))}
              <Typography variant="caption" color="text.secondary">
                Cột được tính là đã bảo vệ khi được che, băm HMAC hoặc loại bỏ. Cột cá nhân giữ nguyên chỉ được phép dưới
                dạng ngoại lệ có thời hạn.
                {riskScore?.row_count_estimated ? ' Điểm rủi ro dùng số dòng ước lượng vì không đếm được nguồn.' : ''}
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Phân bổ hành động bảo vệ
            </Typography>
            <Stack spacing={1.5}>
              {POLICY_ACTIONS.map((action) => (
                <Stack direction="row" justifyContent="space-between" alignItems="center" key={action}>
                  <ActionChip action={action} />
                  <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {actionCounts[action]} cột (
                    {fieldCount > 0 ? Math.round((actionCounts[action] / fieldCount) * 100) : 0}%)
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
