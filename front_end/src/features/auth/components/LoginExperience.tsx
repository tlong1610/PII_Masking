import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, type LoginFormValues } from '../model/loginSchema';
import { routes } from '@/shared/config/routes';
import { BrandLogo, Mascot } from '@/shared/ui';
import loginBackground from '@/assets/login-background.svg';

interface DemoAccountPreset {
  role: 'DPO' | 'Analyst';
  username: string;
  password: string;
  title: string;
  description: string;
  icon: JSX.Element;
}

const DEMO_PRESETS: DemoAccountPreset[] = [
  {
    role: 'DPO',
    username: 'dpo',
    password: 'dpo123',
    title: 'DPO / Người duyệt dữ liệu',
    description: 'Quét nguồn dữ liệu, review phân loại PII, tạo snapshot, phê duyệt phát hành.',
    icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20, color: '#1B51A4' }} />,
  },
  {
    role: 'Analyst',
    username: 'analyst',
    password: 'analyst123',
    title: 'Chuyên viên phân tích (Analyst)',
    description: 'Chỉ đọc snapshot đã phát hành (PUBLISHED), truy vấn tác vụ đã được duyệt.',
    icon: <AnalyticsOutlinedIcon sx={{ fontSize: 20, color: '#0E7490' }} />,
  },
];

const HIGHLIGHTS = [
  {
    icon: <GppGoodOutlinedIcon />,
    title: 'Phân quyền nghiêm ngặt',
    text: 'Đối chiếu Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP, triển khai trên hạ tầng nội bộ.',
  },
  {
    icon: <VisibilityOffOutlinedIcon />,
    title: 'Không hiển thị dữ liệu cá nhân gốc',
    text: 'DPO và Analyst chỉ làm việc với dữ liệu đã che hoặc băm; mọi thao tác được ghi vào sổ cái chuỗi băm.',
  },
];

function BrandMark({ size }: { size: number }): JSX.Element {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 2,
        bgcolor: 'common.white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <BrandLogo size={Math.round(size * 0.78)} />
    </Box>
  );
}

/** Left side, drawn over the background image (wide screens only). */
function BrandPanel(): JSX.Element {
  return (
    <Stack spacing={5} sx={{ color: 'common.white', display: { xs: 'none', md: 'flex' }, maxWidth: 480 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <BrandMark size={52} />
        <Box>
          <Typography variant="h3" component="p" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            PIIGuard Shield
          </Typography>
          <Typography sx={{ opacity: 0.8 }}>Nền tảng bảo vệ dữ liệu cho doanh nghiệp</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={2.5} alignItems="center">
        <Mascot pose="default" size={150} float />
        <Typography sx={{ opacity: 0.85, lineHeight: 1.6 }}>
          Xin chào, mình là <strong>Pango</strong>! Mình rà dữ liệu cá nhân trong cơ sở dữ liệu của bạn và giúp DPO che
          đúng trước khi chia sẻ.
        </Typography>
      </Stack>
      <Stack spacing={3}>
        {HIGHLIGHTS.map((item) => (
          <Stack key={item.title} direction="row" spacing={2} alignItems="flex-start">
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                display: 'flex',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }}
            >
              {item.icon}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5, lineHeight: 1.6 }}>
                {item.text}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
      <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.55 }}>
        Phiên bản v0.2 · triển khai nội bộ
      </Typography>
    </Stack>
  );
}

export function LoginExperience(): JSX.Element {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, user, logout } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPresetRole, setSelectedPresetRole] = useState<'DPO' | 'Analyst' | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const handleSelectPreset = (preset: DemoAccountPreset): void => {
    setSelectedPresetRole(preset.role);
    setValue('username', preset.username, { shouldValidate: true });
    setValue('password', preset.password, { shouldValidate: true });
    clearError();
  };

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    clearError();
    try {
      const session = await login(values);
      const targetRoute = session.user.role === 'DPO' ? routes.dpo : routes.analyst;
      navigate(targetRoute);
    } catch {
      // Error handled via useAuth context state
    }
  };

  return (
    <Box
      sx={{
        // One screen, no page scroll. Very short windows (landscape phones) still get a scrollbar
        // so the form never becomes unreachable.
        height: '100dvh',
        overflow: 'hidden',
        '@media (max-height: 620px)': { height: 'auto', minHeight: '100dvh', overflow: 'auto' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 6 },
        py: 2,
        bgcolor: 'primary.dark',
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1160,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 500px' },
          gap: { md: 8 },
          alignItems: 'center',
        }}
      >
        <BrandPanel />

        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 24px 60px -12px rgba(2, 6, 23, 0.55)',
            width: '100%',
            maxWidth: 500,
            justifySelf: 'center',
          }}
        >
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            {/* Brand inside the card on small screens, where the left panel is hidden */}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3, display: { xs: 'flex', md: 'none' } }}>
              <BrandMark size={40} />
              <Box>
                <Typography sx={{ fontWeight: 800 }}>PIIGuard Shield</Typography>
                <Typography variant="caption">Nền tảng bảo vệ dữ liệu cho doanh nghiệp</Typography>
              </Box>
            </Stack>

            {user && (
              <Alert
                severity="info"
                sx={{ mb: 2 }}
                action={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => navigate(user.role === 'DPO' ? routes.dpo : routes.analyst)}>
                      Vào tiếp
                    </Button>
                    <Button size="small" color="inherit" onClick={logout}>
                      Đăng xuất
                    </Button>
                  </Stack>
                }
              >
                Đang đăng nhập: <strong>{user.username}</strong> ({user.role})
              </Alert>
            )}

              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
                    Đăng nhập tài khoản
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5 }}>
                    Chọn vai trò mẫu hoặc nhập thông tin ủy quyền của bạn
                  </Typography>
                </Box>

                {/* Preset Role Cards */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      color: '#6B7280',
                      letterSpacing: '0.04em',
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    Chọn nhanh tài khoản mẫu:
                  </Typography>
                  <Grid container spacing={1.5}>
                    {DEMO_PRESETS.map((preset) => {
                      const isSelected = selectedPresetRole === preset.role;
                      return (
                        <Grid item xs={12} sm={6} key={preset.username}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: '100%',
                              borderRadius: '8px',
                              borderColor: isSelected ? '#1B51A4' : '#E5E7EB',
                              bgcolor: isSelected ? '#F0F7FF' : '#FFFFFF',
                              boxShadow: isSelected ? '0 0 0 1px #1B51A4' : 'none',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                borderColor: '#1B51A4',
                                bgcolor: '#F8FAFC',
                              },
                            }}
                          >
                            <CardActionArea
                              onClick={() => handleSelectPreset(preset)}
                              sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                            >
                              <Stack spacing={0.75} sx={{ width: '100%' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {preset.icon}
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                                      {preset.title}
                                    </Typography>
                                  </Stack>
                                  {isSelected && <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#1B51A4' }} />}
                                </Stack>
                                <Typography variant="caption" sx={{ color: '#4B5563', fontSize: '0.72rem', lineHeight: 1.4 }}>
                                  {preset.description}
                                </Typography>
                                <Box sx={{ pt: 0.5 }}>
                                  <Chip
                                    label={`${preset.username} / ${preset.password}`}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.68rem',
                                      fontFamily: 'monospace',
                                      fontWeight: 600,
                                      bgcolor: '#F3F4F6',
                                      color: '#374151',
                                      border: '1px solid #E5E7EB',
                                    }}
                                  />
                                </Box>
                              </Stack>
                            </CardActionArea>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>

                <Divider sx={{ my: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.7rem', fontWeight: 600 }}>
                    HOẶC NHẬP THÔNG TIN
                  </Typography>
                </Divider>

                {/* Form */}
                <Box
                  component="form"
                  onSubmit={(e) => {
                    void handleSubmit(onSubmit)(e);
                  }}
                  noValidate
                >
                  <Stack spacing={2}>
                    {error ? (
                      <Alert severity="error" onClose={clearError} sx={{ fontSize: '0.8rem' }}>
                        {error}
                      </Alert>
                    ) : null}

                    {/* Username */}
                    <Controller
                      name="username"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          id="login-username"
                          label="Tài khoản"
                          placeholder="Nhập tên tài khoản (VD: dpo hoặc analyst)"
                          fullWidth
                          size="small"
                          autoComplete="username"
                          error={Boolean(errors.username)}
                          helperText={errors.username?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutlineOutlinedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />

                    {/* Password */}
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          id="login-password"
                          label="Mật khẩu"
                          placeholder="Nhập mật khẩu"
                          size="small"
                          type={showPassword ? 'text' : 'password'}
                          fullWidth
                          autoComplete="current-password"
                          error={Boolean(errors.password)}
                          helperText={errors.password?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockOutlinedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  edge="end"
                                  size="small"
                                >
                                  {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={isLoading}
                      startIcon={
                        isLoading ? <CircularProgress size={16} color="inherit" /> : <LoginOutlinedIcon sx={{ fontSize: 18 }} />
                      }
                      sx={{
                        mt: 1,
                        py: 1,
                        bgcolor: '#1B51A4',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        borderRadius: '6px',
                        '&:hover': { bgcolor: '#154185' },
                      }}
                    >
                      {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
