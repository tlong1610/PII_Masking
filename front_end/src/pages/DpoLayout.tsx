import { Suspense } from 'react';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { routes } from '@/shared/config/routes';
import { AppShell, MascotLoader, type AppShellNavItem } from '@/shared/ui';

export function DpoLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems: AppShellNavItem[] = [
    { label: 'Quét & duyệt', to: routes.dpo, icon: <FactCheckOutlinedIcon fontSize="small" />, end: true },
    { label: 'Lịch sử quét', to: routes.dpoRuns, icon: <HistoryOutlinedIcon fontSize="small" /> },
    { label: 'Nhật ký hoạt động', to: routes.dpoAudit, icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
    { label: 'Demo che dữ liệu', to: routes.dpoMasking, icon: <VisibilityOffOutlinedIcon fontSize="small" /> },
    { label: 'Quy định pháp luật', to: routes.dpoRules, icon: <GavelOutlinedIcon fontSize="small" /> },
  ];

  const handleLogout = (): void => {
    logout();
    navigate(routes.login);
  };

  return (
    <AppShell activeRole="DPO" currentUser={user} onLogout={handleLogout} navItems={navItems}>
      {/* Keep the shell on screen while a lazily loaded DPO page arrives. */}
      <Suspense fallback={<MascotLoader title="Đang tải trang…" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

