import { useCallback, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import type { Theme } from '@mui/material/styles';
import { NavLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { APP_HEADER_HEIGHT } from '@/shared/config/layout';
import { AppBarSlotContext, type AppBarSlotValue } from './appBarSlotContext';

export interface AppShellUser {
  username: string;
  role?: string;
}

export interface AppShellNavItem {
  label: string;
  to?: string;
  onClick?: () => void;
  icon: ReactNode;
  /** Match the path exactly (for index routes such as `/dpo`). */
  end?: boolean;
}

type AppShellProps = PropsWithChildren<{
  activeRole: 'DPO' | 'Analyst';
  currentUser?: AppShellUser | null;
  onLogout?: () => void;
  /** Pages of the active workspace. Without it, the menu lists the workspaces the user may open. */
  navItems?: AppShellNavItem[];
}>;

const RAIL_WIDTH = 68;
const EXPANDED_WIDTH = 240;
const NAV_COLLAPSED_KEY = 'piiguard.navCollapsed';

function readNavCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeNavCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // Storage may be blocked (private mode); the toggle still works for this session.
  }
}

const motion = (theme: Theme, property: string) => ({
  transition: theme.transitions.create(property, { duration: theme.transitions.duration.shorter }),
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
});

/**
 * Text that fades out instead of disappearing, so collapsing never reflows the rail: icons keep
 * their position and the shrinking width simply clips the label.
 */
function fadingLabelSx(collapsed: boolean) {
  return (theme: Theme) => ({
    display: { xs: 'none', md: 'block' },
    whiteSpace: 'nowrap' as const,
    opacity: collapsed ? 0 : 1,
    ...motion(theme, 'opacity'),
  });
}

const navButtonSx = {
  justifyContent: 'flex-start',
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  px: 1.5,
  py: 0.85,
  color: 'text.secondary',
  fontWeight: 500,
  borderLeft: 3,
  borderColor: 'transparent',
  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  '&.active': {
    color: 'primary.main',
    bgcolor: 'primary.light',
    borderColor: 'primary.main',
    fontWeight: 700,
  },
} as const;

function NavButton({ item, collapsed }: { item: AppShellNavItem; collapsed: boolean }): JSX.Element {
  if (item.onClick) {
    return (
      <Tooltip title={collapsed ? item.label : ''} placement="right">
        <Button
          onClick={item.onClick}
          aria-label={item.label}
          fullWidth
          startIcon={item.icon}
          sx={navButtonSx}
        >
          <Box component="span" sx={fadingLabelSx(collapsed)}>
            {item.label}
          </Box>
        </Button>
      </Tooltip>
    );
  }

  return (
    // aria-label keeps the link named while only icons show; the tooltip names it for sighted users.
    <Tooltip title={collapsed ? item.label : ''} placement="right">
      <Button
        component={NavLink}
        to={item.to ?? '#'}
        end={item.end}
        aria-label={item.label}
        fullWidth
        startIcon={item.icon}
        sx={navButtonSx}
      >
        <Box component="span" sx={fadingLabelSx(collapsed)}>
          {item.label}
        </Box>
      </Button>
    </Tooltip>
  );
}

export function AppShell({ activeRole, currentUser, onLogout, navItems, children }: AppShellProps): JSX.Element {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(readNavCollapsed);
  // Pages may replace the workspace title with their own navigation (see AppBarSlot).
  const [slotNode, setSlotNode] = useState<HTMLElement | null>(null);
  const [slotUsers, setSlotUsers] = useState(0);
  const registerSlot = useCallback(() => {
    setSlotUsers((count) => count + 1);
    return () => setSlotUsers((count) => count - 1);
  }, []);
  const slot = useMemo<AppBarSlotValue>(() => ({ node: slotNode, register: registerSlot }), [slotNode, registerSlot]);
  const canOpenDpo = !currentUser || currentUser.role === 'DPO';
  const canOpenAnalyst = !currentUser || currentUser.role === 'Analyst';

  const workspaces: AppShellNavItem[] = [
    ...(canOpenDpo ? [{ label: 'DPO', to: routes.dpo, icon: <StorageOutlinedIcon fontSize="small" /> }] : []),
    ...(canOpenAnalyst
      ? [{ label: 'Analyst', to: routes.analyst, icon: <FolderOutlinedIcon fontSize="small" /> }]
      : []),
  ];
  // A workspace switcher only helps when there is more than one workspace to switch to.
  const items = [...(navItems && workspaces.length > 1 ? workspaces : []), ...(navItems ?? workspaces)];

  const toggleNav = (): void => {
    setNavCollapsed((current) => {
      writeNavCollapsed(!current);
      return !current;
    });
  };

  const handleConfirmLogout = (): void => {
    setLogoutDialogOpen(false);
    onLogout?.();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        component="aside"
        sx={(theme) => ({
          width: navCollapsed ? RAIL_WIDTH : { xs: RAIL_WIDTH, md: EXPANDED_WIDTH },
          flexShrink: 0,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          ...motion(theme, 'width'),
        })}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ px: 2.25, height: APP_HEADER_HEIGHT, flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}
        >
          <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            <LayersOutlinedIcon fontSize="small" />
          </Avatar>
          <Box sx={fadingLabelSx(navCollapsed)}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              PIIGuard Shield
            </Typography>
            <Typography variant="caption">Bảo vệ dữ liệu cho doanh nghiệp</Typography>
          </Box>
        </Stack>

        <Box
          component="nav"
          aria-label="Điều hướng chính"
          sx={{ flexGrow: 1, py: 1.5, px: 1, overflowY: 'auto', overflowX: 'hidden' }}
        >
          <Stack spacing={0.5}>
            {items.map((item) => (
              <NavButton key={item.to} item={item} collapsed={navCollapsed} />
            ))}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        <Box
          component="header"
          sx={{
            height: APP_HEADER_HEIGHT,
            flexShrink: 0,
            px: { xs: 2, md: 3 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexGrow: 1, mr: 2 }}>
            <Tooltip title={navCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>
              <IconButton
                size="small"
                onClick={toggleNav}
                aria-label={navCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                aria-expanded={!navCollapsed}
                sx={{ display: { xs: 'none', md: 'inline-flex' } }}
              >
                {navCollapsed ? <MenuIcon fontSize="small" /> : <MenuOpenIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {slotUsers === 0 && (
              <Typography variant="subtitle2" color="text.secondary">
                {activeRole === 'DPO' ? 'Không gian DPO' : 'Không gian Analyst'}
              </Typography>
            )}
            <Box ref={setSlotNode} sx={{ minWidth: 0, display: 'flex', alignItems: 'center' }} />
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip
              icon={<VerifiedUserOutlinedIcon fontSize="small" />}
              label="Không trả về giá trị PII gốc"
              color="success"
              variant="outlined"
              size="small"
              sx={{ display: { xs: 'none', lg: 'inline-flex' }, fontWeight: 600 }}
            />
            {currentUser ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: currentUser.role === 'DPO' ? 'primary.main' : 'secondary.main',
                    typography: 'caption',
                    fontWeight: 700,
                  }}
                >
                  {currentUser.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {currentUser.username}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ lineHeight: 1.2 }}>
                    {currentUser.role ?? 'User'}
                  </Typography>
                </Box>
              </Stack>
            ) : null}
            {onLogout ? (
              <Tooltip title="Đăng xuất">
                <IconButton
                  size="small"
                  onClick={() => setLogoutDialogOpen(true)}
                  aria-label="Đăng xuất"
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                >
                  <LogoutOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
          <AppBarSlotContext.Provider value={slot}>{children}</AppBarSlotContext.Provider>
        </Box>
      </Box>

      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        maxWidth="xs"
      >
        <DialogTitle id="logout-dialog-title">Xác nhận đăng xuất</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc
            {currentUser?.username ? ` của tài khoản "${currentUser.username}"` : ''}? Các thay đổi chưa lưu trong
            màn hình duyệt sẽ bị mất.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setLogoutDialogOpen(false)} variant="outlined" size="small">
            Hủy
          </Button>
          <Button onClick={handleConfirmLogout} variant="contained" color="error" size="small" autoFocus>
            Đăng xuất
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
