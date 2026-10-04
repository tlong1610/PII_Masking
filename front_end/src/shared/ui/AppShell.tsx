import { useState, type PropsWithChildren } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import InputBase from '@mui/material/InputBase';

import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';

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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Databricks Web Primary Left Navigation Sidebar */}
      <Box
        component="aside"
        sx={{
          width: { xs: 68, md: 230 },
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1200,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* Brand Header */}
        <Box
          sx={{
            p: { xs: 1.5, md: 2 },
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
            minHeight: 56,
          }}
        >
          {/* Databricks-inspired layered emblem */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 1px 3px rgba(27,81,164,0.3)',
            }}
          >
            <LayersOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1, letterSpacing: '-0.01em' }}
            >
              PIIGuard Shield
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
              Data Intelligence & Governance
            </Typography>
          </Box>
        </Box>

        {/* Quick New Action Button */}
        <Box sx={{ p: { xs: 1, md: 1.5 }, pb: 0.5 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              borderColor: '#D1D5DB',
              color: '#1F2937',
              bgcolor: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.8125rem',
              borderRadius: '6px',
              justifyContent: 'flex-start',
              px: 1.5,
              py: 0.75,
              '&:hover': {
                borderColor: '#9CA3AF',
                bgcolor: '#F3F4F6',
              },
            }}
          >
            New Action
          </Button>
        </Box>

        {/* Navigation Sections */}
        <Box sx={{ flexGrow: 1, py: 1, overflowY: 'auto' }}>
          {/* Section: Data & Catalog */}
          <Box sx={{ px: { xs: 1, md: 2 }, pt: 1, pb: 0.5, display: { xs: 'none', md: 'block' } }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#6B7280',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Catalog & Workspaces
            </Typography>
          </Box>

          <Stack spacing={0.5} sx={{ px: 1 }}>
            {canOpenDpo ? (
              <Button
                component={NavLink}
                to={routes.dpo}
                fullWidth
                startIcon={<StorageOutlinedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 0.85,
                  borderRadius: '6px',
                  fontWeight: activeRole === 'DPO' ? 700 : 500,
                  color: activeRole === 'DPO' ? 'primary.main' : 'text.primary',
                  bgcolor: activeRole === 'DPO' ? 'primary.light' : 'transparent',
                  borderLeft: activeRole === 'DPO' ? '3px solid #1B51A4' : '3px solid transparent',
                  '&:hover': {
                    bgcolor: activeRole === 'DPO' ? 'primary.light' : '#F3F4F6',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                  DPO
                </Box>
              </Button>
            ) : null}

            {canOpenAnalyst ? (
              <Button
                component={NavLink}
                to={routes.analyst}
                fullWidth
                startIcon={<FolderOutlinedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 0.85,
                  borderRadius: '6px',
                  fontWeight: activeRole === 'Analyst' ? 700 : 500,
                  color: activeRole === 'Analyst' ? 'primary.main' : 'text.primary',
                  bgcolor: activeRole === 'Analyst' ? 'primary.light' : 'transparent',
                  borderLeft: activeRole === 'Analyst' ? '3px solid #1B51A4' : '3px solid transparent',
                  '&:hover': {
                    bgcolor: activeRole === 'Analyst' ? 'primary.light' : '#F3F4F6',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                  Analyst
                </Box>
              </Button>
            ) : null}
          </Stack>

          {/* Section: Security & Governance */}
          <Box sx={{ px: { xs: 1, md: 2 }, pt: 2, pb: 0.5, display: { xs: 'none', md: 'block' } }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#6B7280',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Security & Compliance
            </Typography>
          </Box>

          <Stack spacing={0.5} sx={{ px: 1 }}>
            <Tooltip title="Chính sách bảo mật Nghị định 13" placement="right">
              <Button
                fullWidth
                startIcon={<SecurityOutlinedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 0.85,
                  borderRadius: '6px',
                  color: 'text.secondary',
                  fontWeight: 500,
                  '&:hover': { bgcolor: '#F3F4F6', color: 'text.primary' },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                  Nghị định 13 Rules
                </Box>
              </Button>
            </Tooltip>

            <Tooltip title="Sổ cái toàn vẹn Hash-Chain" placement="right">
              <Button
                fullWidth
                startIcon={<HistoryEduIcon sx={{ fontSize: 18 }} />}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 0.85,
                  borderRadius: '6px',
                  color: 'text.secondary',
                  fontWeight: 500,
                  '&:hover': { bgcolor: '#F3F4F6', color: 'text.primary' },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                  Audit Hash-Chain
                </Box>
              </Button>
            </Tooltip>
          </Stack>
        </Box>

        {/* Footer Area: User & System Status */}
        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: '#FAFAFA',
          }}
        >
          {/* On-premise environment badge */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: '#ECFDF5',
              border: '1px solid #A7F3D0',
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16A34A' }} />
            <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 600, fontSize: '0.7rem' }}>
              On-Premise Metastore
            </Typography>
          </Box>

          {currentUser ? (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: currentUser.role === 'DPO' ? 'primary.main' : 'secondary.main',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {currentUser.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentUser.username}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem', display: 'block' }}>
                    {currentUser.role ?? 'User'}
                  </Typography>
                </Box>
              </Stack>

              {onLogout ? (
                <Tooltip title="Đăng xuất">
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => setLogoutDialogOpen(true)}
                    sx={{
                      minWidth: 'auto',
                      p: 0.75,
                      color: '#6B7280',
                      '&:hover': { color: 'error.main', bgcolor: '#FEE2E2' },
                    }}
                    aria-label="Đăng xuất"
                  >
                    <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
                  </Button>
                </Tooltip>
              ) : null}
            </Stack>
          ) : (
            onLogout && (
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => setLogoutDialogOpen(true)}
                startIcon={<LogoutOutlinedIcon sx={{ fontSize: 16 }} />}
              >
                Đăng xuất
              </Button>
            )
          )}
        </Box>
      </Box>

      {/* Main Workspace Frame */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Databricks Top Context Header Bar */}
        <Box
          component="header"
          sx={{
            height: 52,
            px: { xs: 2, md: 3 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 1100,
          }}
        >
          {/* Central Databricks Search Bar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              px: 1.5,
              py: 0.5,
              width: { xs: '100%', sm: 380, md: 460 },
            }}
          >
            <SearchIcon sx={{ color: '#9CA3AF', fontSize: 18 }} />
            <InputBase
              placeholder="Search tables, schemas, PII policies, recents... (Ctrl + K)"
              fullWidth
              sx={{ fontSize: '0.8125rem', color: '#1F2937' }}
            />
            <Chip
              label="Ctrl K"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                color: '#6B7280',
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          </Box>

          {/* Right System Badges */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip
              icon={<VerifiedUserOutlinedIcon sx={{ fontSize: '14px !important' }} />}
              label="Zero Raw-PII Leak Boundary"
              color="success"
              variant="outlined"
              size="small"
              sx={{
                display: { xs: 'none', lg: 'inline-flex' },
                fontSize: '0.72rem',
                borderColor: '#86EFAC',
                bgcolor: '#F0FDF4',
                color: '#15803D',
                fontWeight: 600,
              }}
            />

            <Chip
              icon={<StorageOutlinedIcon sx={{ fontSize: '14px !important' }} />}
              label="On-premise demo"
              color="primary"
              variant="outlined"
              size="small"
              sx={{
                fontSize: '0.72rem',
                borderColor: '#BFDBFE',
                bgcolor: '#EFF6FF',
                color: '#1D4ED8',
                fontWeight: 600,
              }}
            />
          </Stack>
        </Box>

        {/* Content Body */}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>

      {/* Databricks-styled Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            maxWidth: 440,
          },
        }}
      >
        <DialogTitle id="logout-dialog-title" sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
          Xác nhận đăng xuất
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description" sx={{ fontSize: '0.85rem', color: '#4B5563' }}>
            Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc
            {currentUser?.username ? ` của tài khoản "${currentUser.username}"` : ''}? Các phiên kiểm tra và cấu hình chưa
            lưu trên On-Premise Metastore có thể bị đặt lại.
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
