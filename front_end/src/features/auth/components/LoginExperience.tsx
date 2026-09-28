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
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
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
    icon: <AdminPanelSettingsOutlinedIcon color="primary" fontSize="medium" />,
  },
  {
    role: 'Analyst',
    username: 'analyst',
    password: 'analyst123',
    title: 'Data Analyst',
    description: 'Chỉ đọc snapshot đã phát hành (PUBLISHED), truy vấn tác vụ đã được duyệt.',
    icon: <AnalyticsOutlinedIcon color="secondary" fontSize="medium" />,
  },
];

export function LoginExperience(): JSX.Element {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, user, logout } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

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
    <Box sx={{ minHeight: '100vh', display: 'grid', alignItems: 'center', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Left Hero Column */}
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ShieldOutlinedIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    PIIGuard VN
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bảo vệ dữ liệu cá nhân & Tuân thủ Nghị định 13
                  </Typography>
                </Box>
              </Stack>

              <Box>
                <Typography variant="h2" sx={{ mb: 1.5, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                  Cổng đăng nhập hệ thống
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Hệ thống phân quyền nghiêm ngặt theo vai trò DPO (Data Protection Officer) và Analyst.
                  Xác thực phân quyền từ máy chủ với giao diện chuẩn no-raw-value.
                </Typography>
              </Box>

              <Alert severity="info" variant="outlined">
                <strong>No-raw-value UI:</strong> Cả DPO và Analyst đều không nhìn thấy dữ liệu PII nguồn thô.
              </Alert>

              {user ? (
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Phiên làm việc hiện tại:
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {user.username}
                    </Typography>
                    <Chip
                      label={user.role}
                      size="small"
                      color={user.role === 'DPO' ? 'primary' : 'secondary'}
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
                </Card>
              ) : null}
            </Stack>
          </Grid>

          {/* Right Form Column */}
          <Grid item xs={12} md={7}>
            <Card sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 2 }}>
              <CardContent sx={{ p: 0 }}>
                <Stack spacing={3.5}>
                  <Box>
                    <Typography variant="h3" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      Đăng nhập tài khoản
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Nhập tài khoản và mật khẩu được cấp, hoặc chọn nhanh tài khoản demo bên dưới.
                    </Typography>
                  </Box>

                  {/* Demo presets quick-fill */}
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}
                    >
                      Chọn nhanh tài khoản mẫu:
                    </Typography>
                    <Grid container spacing={1.5}>
                      {DEMO_PRESETS.map((preset) => (
                        <Grid item xs={12} sm={6} key={preset.username}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: '100%',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'rgba(26, 115, 232, 0.04)',
                              },
                            }}
                          >
                            <CardActionArea
                              onClick={() => handleSelectPreset(preset)}
                              sx={{ p: 1.5, height: '100%' }}
                            >
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {preset.icon}
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                      {preset.title}
                                    </Typography>
                                  </Stack>
                                  <Chip
                                    label={preset.role}
                                    size="small"
                                    color={preset.role === 'DPO' ? 'primary' : 'secondary'}
                                    variant="outlined"
                                  />
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                  {preset.description}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: 'text.primary',
                                    bgcolor: 'action.hover',
                                    p: 0.5,
                                    borderRadius: 1,
                                    display: 'inline-block',
                                  }}
                                >
                                  {preset.username} / {preset.password}
                                </Typography>
                              </Stack>
                            </CardActionArea>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
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
                    <Stack spacing={2.5}>
                      {error ? (
                        <Alert severity="error" onClose={clearError}>
                          {error}
                        </Alert>
                      ) : null}

                      {/* Tài khoản (Username) */}
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
                            autoComplete="username"
                            error={Boolean(errors.username)}
                            helperText={errors.username?.message}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonOutlineOutlinedIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />

                      {/* Mật khẩu (Password) */}
                      <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            id="login-password"
                            label="Mật khẩu"
                            placeholder="Nhập mật khẩu"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            autoComplete="current-password"
                            error={Boolean(errors.password)}
                            helperText={errors.password?.message}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LockOutlinedIcon color="action" />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    edge="end"
                                  >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
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
                        size="large"
                        disabled={isLoading}
                        startIcon={
                          isLoading ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <LoginOutlinedIcon />
                          )
                        }
                        sx={{ mt: 1, py: 1.5 }}
                      >
                        {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
