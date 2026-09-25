import type { PropsWithChildren } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import { NavLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';

type AppShellProps = PropsWithChildren<{
  activeRole: 'DPO' | 'Analyst';
}>;

export function AppShell({ activeRole, children }: AppShellProps): JSX.Element {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: { xs: 72, md: 80 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
            <ShieldOutlinedIcon color="primary" fontSize="large" />
            <Box>
              <Typography variant="h6" color="text.primary" sx={{ fontWeight: 800 }}>
                PIIGuard VN
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dữ liệu mô phỏng • no-raw-value UI
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
            aria-label="Điều hướng vai trò"
          >
            <Button component={NavLink} to={routes.dpo} variant={activeRole === 'DPO' ? 'contained' : 'text'}>
              DPO
            </Button>
            <Button
              component={NavLink}
              to={routes.analyst}
              variant={activeRole === 'Analyst' ? 'contained' : 'text'}
            >
              Analyst
            </Button>
          </Stack>
          <Chip
            icon={<StorageOutlinedIcon />}
            label="On-premise demo"
            color="primary"
            variant="outlined"
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          />
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
    </Box>
  );
}
