import { Suspense } from 'react';
import LinearProgress from '@mui/material/LinearProgress';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { routes } from '@/shared/config/routes';
import { AppShell, type AppShellNavItem } from '@/shared/ui';

const DPO_NAV_ITEMS: AppShellNavItem[] = [
  { label: 'Quét & duyệt', to: routes.dpo, icon: <FactCheckOutlinedIcon fontSize="small" />, end: true },
  { label: 'Lịch sử quét', to: routes.dpoRuns, icon: <HistoryOutlinedIcon fontSize="small" /> },
  { label: 'Dataset đã bảo vệ', to: routes.dpoDatasets, icon: <Inventory2OutlinedIcon fontSize="small" /> },
  { label: 'Nhật ký kiểm toán', to: routes.dpoAudit, icon: <HistoryEduOutlinedIcon fontSize="small" /> },
];

export function DpoLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate(routes.login);
  };

  return (
    <AppShell activeRole="DPO" currentUser={user} onLogout={handleLogout} navItems={DPO_NAV_ITEMS}>
      {/* Keep the shell on screen while a lazily loaded DPO page arrives. */}
      <Suspense fallback={<LinearProgress aria-label="Đang tải trang" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
