import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
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
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, type LoginFormValues } from '../model/loginSchema';
import { routes } from '@/shared/config/routes';

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
    title: 'DPO / Data Reviewer',
    description: 'Quét nguồn dữ liệu, review phân loại PII, tạo snapshot, phê duyệt phát hành.',
    icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20, color: '#1B51A4' }} />,
  },
  {
    role: 'Analyst',
    username: 'analyst',
    password: 'analyst123',
    title: 'Data Analyst',
    description: 'Chỉ đọc snapshot đã phát hành (PUBLISHED), truy vấn tác vụ đã được duyệt.',
    icon: <AnalyticsOutlinedIcon sx={{ fontSize: 20, color: '#0E7490' }} />,
  },
];

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
        minHeight: '100vh',
        bgcolor: '#F8F9FA',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, md: 8 },
        px: 2,
      }}
    >
      {/* Databricks Branding Header */}
      <Stack alignItems="center" spacing={1} sx={{ mb: 4 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '8px',
            bgcolor: '#1B51A4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(27, 81, 164, 0.25)',
          }}
        >
          <LayersOutlinedIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
          PIIGuard Shield
        </Typography>
        <Typography variant="body2" sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
          On-Premise Data Intelligence & PII Governance Platform
        </Typography>
      </Stack>

      <Container maxWidth="md">
        <Card
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <Grid container>
            {/* Left Context Column */}
            <Grid
              item
              xs={12}
              md={5}
              sx={{
                p: { xs: 3, md: 4 },
                bgcolor: '#F9FAFB',
                borderRight: { md: '1px solid #E5E7EB' },
                borderBottom: { xs: '1px solid #E5E7EB', md: 'none' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                    Phân quyền nghiêm ngặt
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5, lineHeight: 1.6 }}>
                    Hệ thống tuân thủ Nghị định 13/2023/NĐ-CP với kiến trúc on-premise an toàn tuyệt đối. Cả DPO và Analyst
                    đều được quản trị qua ranh giới no-raw-value.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: '8px',
                    bgcolor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E3A8A', display: 'block', mb: 0.5 }}>
                    Zero Raw-PII Leak UI
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#1E40AF', display: 'block', lineHeight: 1.5 }}>
                    Không lưu trữ hoặc truyền dữ liệu PII nguồn thô qua giao diện người dùng. Mọi truy cập được xác minh qua
                    sổ cái Hash-Chain.
                  </Typography>
                </Box>

                {user && (
                  <Box sx={{ p: 2, borderRadius: '8px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
                    <Typography variant="caption" color="text.secondary">
                      Phiên đăng nhập hiện tại:
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, mb: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {user.username}
                      </Typography>
                      <Chip
                        label={user.role}
                        size="small"
                        color={user.role === 'DPO' ? 'primary' : 'secondary'}
                        sx={{ height: 20, fontSize: '0.68rem' }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate(user.role === 'DPO' ? routes.dpo : routes.analyst)}
                      >
                        Vào workspace {user.role}
                      </Button>
                      <Button variant="outlined" size="small" color="inherit" onClick={logout}>
                        Đăng xuất
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Stack>

              <Typography variant="caption" sx={{ color: '#9CA3AF', mt: 3, display: 'block' }}>
                Phiên bản v0.2 On-Premise Enterprise
              </Typography>
            </Grid>

            {/* Right Form Column */}
            <Grid item xs={12} md={7} sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={3}>
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
            </Grid>
          </Grid>
        </Card>
      </Container>
    </Box>
  );
}
