import { Suspense, useState } from 'react';
import LinearProgress from '@mui/material/LinearProgress';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { MaskingShowcaseDialog, Nd13RulesDrawer } from '@/features/compliance';
import { routes } from '@/shared/config/routes';
import { AppShell, type AppShellNavItem } from '@/shared/ui';

export function DpoLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  const navItems: AppShellNavItem[] = [
    { label: 'Quét & duyệt', to: routes.dpo, icon: <FactCheckOutlinedIcon fontSize="small" />, end: true },
    { label: 'Lịch sử quét', to: routes.dpoRuns, icon: <HistoryOutlinedIcon fontSize="small" /> },
    { label: 'Dataset đã bảo vệ', to: routes.dpoDatasets, icon: <Inventory2OutlinedIcon fontSize="small" /> },
    { label: 'Sổ cái Hash-Chain', to: routes.dpoAudit, icon: <AccountTreeOutlinedIcon fontSize="small" /> },
    { label: 'Demo che dữ liệu', onClick: () => setShowcaseOpen(true), icon: <VisibilityOffOutlinedIcon fontSize="small" /> },
    { label: 'Nghị định 13 Rules', onClick: () => setRulesOpen(true), icon: <GavelOutlinedIcon fontSize="small" /> },
  ];

  const handleLogout = (): void => {
    logout();
    navigate(routes.login);
  };

  return (
    <>
      <AppShell activeRole="DPO" currentUser={user} onLogout={handleLogout} navItems={navItems}>
        {/* Keep the shell on screen while a lazily loaded DPO page arrives. */}
        <Suspense fallback={<LinearProgress aria-label="Đang tải trang" />}>
          <Outlet />
        </Suspense>
      </AppShell>
      <Nd13RulesDrawer open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <MaskingShowcaseDialog open={showcaseOpen} onClose={() => setShowcaseOpen(false)} />
    </>
  );
}

