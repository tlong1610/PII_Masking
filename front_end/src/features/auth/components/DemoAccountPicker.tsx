import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { DEMO_ACCOUNTS, type DemoAccount } from '../model/demoAccounts';

const ICONS: Record<DemoAccount['role'], JSX.Element> = {
  DPO: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
  Analyst: <AnalyticsOutlinedIcon sx={{ fontSize: 20, color: 'secondary.main' }} />,
};

type DemoAccountPickerProps = {
  selectedRole: DemoAccount['role'] | null;
  onSelect: (account: DemoAccount) => void;
};

/** Development / internal-demo only: one-click demo accounts. Hidden in release builds. */
export function DemoAccountPicker({ selectedRole, onSelect }: DemoAccountPickerProps): JSX.Element {
  return (
    <>
      <Box>
        <Typography
          variant="caption"
          sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', display: 'block', mb: 1 }}
        >
          Chọn nhanh tài khoản mẫu:
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {DEMO_ACCOUNTS.map((account) => {
            const isSelected = selectedRole === account.role;
            return (
              <Card
                key={account.username}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'primary.light' : 'background.paper',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <CardActionArea onClick={() => onSelect(account)} sx={{ p: 1.5, height: '100%' }}>
                  <Stack spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        {ICONS[account.role]}
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {account.title}
                        </Typography>
                      </Stack>
                      {isSelected && <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {account.description}
                    </Typography>
                    <Box sx={{ pt: 0.5 }}>
                      <Chip
                        label={`${account.username} / ${account.password}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontFamily: 'monospace', fontWeight: 600 }}
                      />
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </Box>
      <Divider sx={{ my: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
          HOẶC NHẬP THÔNG TIN
        </Typography>
      </Divider>
    </>
  );
}
