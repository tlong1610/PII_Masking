import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../model/types';

type RequireRoleProps = {
  role: UserRole;
  children: JSX.Element;
};

export function RequireRole({ role, children }: RequireRoleProps): JSX.Element {
  const { user, isAuthenticated, isSessionReady } = useAuth();
  const location = useLocation();

  if (!isSessionReady) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress aria-label="Đang kiểm tra phiên đăng nhập" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace state={{ from: location }} />;
  }

  if (user?.role !== role) {
    const targetRoute = user?.role === 'DPO' ? routes.dpo : routes.analyst;
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Paper variant="outlined" sx={{ maxWidth: 520, p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h4">Không có quyền truy cập</Typography>
            <Typography color="text.secondary">
              Tài khoản hiện tại là {user?.role}. Khu vực này chỉ dành cho vai trò {role}.
            </Typography>
            <Button component={Link} variant="contained" to={targetRoute}>
              Về workspace của tôi
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return children;
}
