import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginFormValues } from '../model/loginSchema';
import { routes } from '@/shared/config/routes';

const accounts: Array<{
  role: LoginFormValues['role'];
  account: string;
  title: string;
  description: string;
  icon: JSX.Element;
}> = [
  {
    role: 'DPO',
    account: 'dpo.demo@piiguard.vn',
    title: 'DPO / Data reviewer',
    description: 'Quét nguồn, review phân loại, tạo snapshot, hậu kiểm và phát hành.',
    icon: <AdminPanelSettingsOutlinedIcon color="primary" fontSize="large" />,
  },
  {
    role: 'Analyst',
    account: 'analyst.demo@piiguard.vn',
    title: 'Analyst',
    description: 'Chỉ đọc snapshot PUBLISHED và chạy tác vụ mẫu đã được duyệt.',
    icon: <AnalyticsOutlinedIcon color="secondary" fontSize="large" />,
  },
];

export function LoginExperience(): JSX.Element {
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      role: 'DPO',
      account: 'dpo.demo@piiguard.vn',
    },
  });
  const selectedRole = watch('role');

  useEffect(() => {
    setValue(
      'account',
      selectedRole === 'DPO' ? 'dpo.demo@piiguard.vn' : 'analyst.demo@piiguard.vn',
      { shouldValidate: true },
    );
  }, [selectedRole, setValue]);

  const submit = (values: LoginFormValues): void => {
    navigate(values.role === 'DPO' ? routes.dpo : routes.analyst);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', alignItems: 'center', py: 5 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={5}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ShieldOutlinedIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4">PIIGuard VN</Typography>
                  <Typography color="text.secondary">Demo account access</Typography>
                </Box>
              </Stack>
              <Typography variant="h1">Đăng nhập theo vai trò kiểm thử</Typography>
              <Typography color="text.secondary">
                Chọn tài khoản demo để đi đúng luồng DPO hoặc Analyst. Backend production vẫn phải
                xác thực vai trò và trạng thái dataset, UI chỉ mô phỏng luồng P0.
              </Typography>
              <Alert severity="info">
                No-raw-value UI: cả DPO và Analyst đều không thấy giá trị nguồn thô.
              </Alert>
            </Stack>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card
              component="form"
              onSubmit={(event) => {
                void handleSubmit(submit)(event);
              }}
            >
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h3">Chọn tài khoản</Typography>
                    <Typography color="text.secondary">
                      Hai account demo được cấu hình sẵn cho MVP.
                    </Typography>
                  </Box>
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <Grid container spacing={2} role="radiogroup" aria-label="Tài khoản demo">
                        {accounts.map((account) => (
                          <Grid item xs={12} sm={6} key={account.role}>
                            <Card
                              variant="outlined"
                              sx={(theme) => ({
                                height: '100%',
                                borderColor:
                                  field.value === account.role
                                    ? 'primary.main'
                                    : theme.palette.divider,
                                bgcolor:
                                  field.value === account.role
                                    ? 'rgba(211, 227, 253, 0.42)'
                                    : 'background.paper',
                              })}
                            >
                              <CardActionArea
                                role="radio"
                                aria-checked={field.value === account.role}
                                onClick={() => {
                                  field.onChange(account.role);
                                }}
                                sx={{ height: '100%' }}
                              >
                                <CardContent>
                                  <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between">
                                      {account.icon}
                                      <Chip
                                        label={account.role}
                                        color={account.role === 'DPO' ? 'primary' : 'secondary'}
                                        variant="outlined"
                                      />
                                    </Stack>
                                    <Typography variant="h4">{account.title}</Typography>
                                    <Typography color="text.secondary">
                                      {account.description}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {account.account}
                                    </Typography>
                                  </Stack>
                                </CardContent>
                              </CardActionArea>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  />
                  <Controller
                    control={control}
                    name="account"
                    render={({ field }) => (
                      <input
                        type="hidden"
                        value={field.value}
                        onChange={field.onChange}
                        name={field.name}
                      />
                    )}
                  />
                  {errors.account ? (
                    <FormHelperText error>{errors.account.message}</FormHelperText>
                  ) : null}
                  <Button type="submit" variant="contained" size="large" startIcon={<LoginOutlinedIcon />}>
                    Vào workspace {selectedRole}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
