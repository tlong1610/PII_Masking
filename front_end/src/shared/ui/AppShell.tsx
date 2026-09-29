import { useState, type PropsWithChildren } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import { NavLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';

export interface AppShellUser {
  username: string;
  role?: string;
}

type AppShellProps = PropsWithChildren<{
  activeRole: 'DPO' | 'Analyst';
  currentUser?: AppShellUser | null;
  onLogout?: () => void;
}>;

export function AppShell({ activeRole, currentUser, onLogout, children }: AppShellProps): JSX.Element {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const canOpenDpo = !currentUser || currentUser.role === 'DPO';
  const canOpenAnalyst = !currentUser || currentUser.role === 'Analyst';

  const handleConfirmLogout = (): void => {
    setLogoutDialogOpen(false);
    onLogout?.();
  };

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
          {/* Logo & Title */}
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

          {/* Role Navigation */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
            aria-label="Điều hướng vai trò"
          >
            {canOpenDpo ? (
              <Button
                component={NavLink}
                to={routes.dpo}
                variant={activeRole === 'DPO' ? 'contained' : 'text'}
              >
                DPO
              </Button>
            ) : null}
            {canOpenAnalyst ? (
              <Button
                component={NavLink}
                to={routes.analyst}
                variant={activeRole === 'Analyst' ? 'contained' : 'text'}
              >
                Analyst
              </Button>
            ) : null}
          </Stack>

          <Chip
            icon={<StorageOutlinedIcon />}
            label="On-premise demo"
            color="primary"
            variant="outlined"
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          />

          {/* User info & Logout UI */}
          {currentUser ? (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 28, alignSelf: 'center' }} />
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <AccountCircleOutlinedIcon color="action" fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {currentUser.username}
                  </Typography>
                  {currentUser.role ? (
                    <Chip
                      label={currentUser.role}
                      size="small"
                      color={currentUser.role.toUpperCase() === 'DPO' ? 'primary' : 'secondary'}
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                  ) : null}
                </Stack>
                {onLogout ? (
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    startIcon={<LogoutOutlinedIcon fontSize="small" />}
                    onClick={() => setLogoutDialogOpen(true)}
                    sx={{
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&:hover': {
                        borderColor: 'error.main',
                        color: 'error.main',
                        bgcolor: 'error.light',
                      },
                    }}
                  >
                    Đăng xuất
                  </Button>
                ) : null}
              </Stack>
            </>
          ) : (
            onLogout ? (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<LogoutOutlinedIcon fontSize="small" />}
                onClick={() => setLogoutDialogOpen(true)}
              >
                Đăng xuất
              </Button>
            ) : null
          )}
        </Toolbar>
      </AppBar>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">Xác nhận đăng xuất</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc
            {currentUser?.username ? ` của tài khoản "${currentUser.username}"` : ''}? Các thay đổi chưa lưu có thể bị mất.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setLogoutDialogOpen(false)} color="inherit">
            Hủy
          </Button>
          <Button onClick={handleConfirmLogout} variant="contained" color="error" autoFocus>
            Đăng xuất
          </Button>
        </DialogActions>
      </Dialog>

      <Container component="main" maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
    </Box>
  );
}
