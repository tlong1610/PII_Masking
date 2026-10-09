import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api/client';
import { useCreateDataSource, useTestDataSource } from '../hooks/usePiiReview';
import { detectEngine, parseTables, sourceFormSchema, type SourceFormValues } from '../model/sourceForm';

interface AddSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (sourceId: string) => void;
}

const DEFAULT_VALUES: SourceFormValues = { name: '', url: '', namespace: '', tables: '' };

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
}

export function AddSourceDialog({ open, onClose, onCreated }: AddSourceDialogProps): JSX.Element {
  const [showUrl, setShowUrl] = useState(false);
  const [testNote, setTestNote] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const testSource = useTestDataSource();
  const createSource = useCreateDataSource();

  const {
    control,
    handleSubmit,
    getValues,
    trigger,
    reset,
    watch,
    formState: { errors },
  } = useForm<SourceFormValues>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  });

  const engine = detectEngine(watch('url'));
  const busy = testSource.isPending || createSource.isPending;

  const toInput = (values: SourceFormValues) => ({
    name: values.name,
    url: values.url,
    namespace: values.namespace,
    tables: parseTables(values.tables),
  });

  const handleClose = (): void => {
    if (busy) return;
    reset(DEFAULT_VALUES);
    setTestNote(null);
    setSubmitError(null);
    setShowUrl(false);
    onClose();
  };

  const handleTest = async (): Promise<void> => {
    setSubmitError(null);
    setTestNote(null);
    if (!(await trigger())) return;
    try {
      const result = await testSource.mutateAsync(toInput(getValues()));
      setTestNote({ ok: result.ok, message: result.message });
    } catch (error) {
      setTestNote({ ok: false, message: errorMessage(error) });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const source = await createSource.mutateAsync(toInput(values));
      onCreated(source.id);
      handleClose();
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="add-source-title"
      PaperProps={{
        sx: {
          borderRadius: '10px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        {/* Databricks Modal Header */}
        <DialogTitle
          id="add-source-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1.5,
            pt: 2.5,
            px: 3,
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <StorageOutlinedIcon sx={{ color: '#1B51A4', fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
              Thêm nguồn dữ liệu On-Premise
            </Typography>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={busy} aria-label="Đóng modal">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* Databricks Info Box */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: '6px',
                bgcolor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
              }}
            >
              <InfoOutlinedIcon sx={{ color: '#1D4ED8', fontSize: 18, mt: 0.2 }} />
              <Typography variant="caption" sx={{ color: '#1E40AF', lineHeight: 1.5 }}>
                URL kết nối cơ sở dữ liệu được mã hóa lưu trữ trong On-Premise Vault. Hệ thống chỉ đọc metadata và schema,
                không bao giờ lưu hoặc truyền dữ liệu thô.
              </Typography>
            </Box>

            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tên nguồn dữ liệu"
                  placeholder="VD: CRM Khách hàng Core Prod"
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  size="small"
                  autoFocus
                  fullWidth
                />
              )}
            />

            <Controller
              name="url"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Connection URL"
                  placeholder="postgresql://user:password@host:5432/dbname"
                  type={showUrl ? 'text' : 'password'}
                  autoComplete="off"
                  size="small"
                  error={Boolean(errors.url)}
                  helperText={errors.url?.message ?? 'Định dạng: postgresql://… hoặc mongodb://… / mongodb+srv://…'}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {engine && (
                          <Chip
                            size="small"
                            label={engine === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              mr: 0.5,
                              bgcolor: engine === 'postgresql' ? '#EFF6FF' : '#ECFDF5',
                              color: engine === 'postgresql' ? '#1D4ED8' : '#047857',
                            }}
                          />
                        )}
                        <IconButton
                          aria-label={showUrl ? 'Ẩn URL' : 'Hiện URL'}
                          onClick={() => setShowUrl((value) => !value)}
                          edge="end"
                          size="small"
                        >
                          {showUrl ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="namespace"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={engine === 'mongodb' ? 'Database (tùy chọn)' : 'Schema (tùy chọn)'}
                  placeholder={engine === 'mongodb' ? 'Mặc định lấy từ URL' : 'Mặc định: public'}
                  error={Boolean(errors.namespace)}
                  helperText={errors.namespace?.message}
                  size="small"
                  fullWidth
                />
              )}
            />

            <Controller
              name="tables"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={engine === 'mongodb' ? 'Collections cần quét (tùy chọn)' : 'Bảng cần quét (tùy chọn)'}
                  placeholder="customers, orders, accounts"
                  error={Boolean(errors.tables)}
                  helperText={errors.tables?.message ?? 'Ngăn cách bằng dấu phẩy. Để trống để quét toàn bộ.'}
                  size="small"
                  fullWidth
                />
              )}
            />

            {testNote && (
              <Alert severity={testNote.ok ? 'success' : 'error'} sx={{ fontSize: '0.8rem' }}>
                {testNote.message}
              </Alert>
            )}
            {submitError && (
              <Alert severity="error" sx={{ fontSize: '0.8rem' }}>
                {submitError}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        {/* Databricks Modal Footer */}
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB', gap: 1 }}>
          <Button onClick={handleClose} disabled={busy} variant="outlined" size="small">
            Hủy
          </Button>
          <Button
            onClick={() => void handleTest()}
            disabled={busy}
            variant="outlined"
            size="small"
            sx={{ borderColor: '#1B51A4', color: '#1B51A4' }}
          >
            {testSource.isPending ? <CircularProgress size={16} sx={{ color: '#1B51A4' }} /> : 'Kiểm tra kết nối'}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            size="small"
            sx={{ bgcolor: '#1B51A4', '&:hover': { bgcolor: '#154185' } }}
          >
            {createSource.isPending ? <CircularProgress size={16} color="inherit" /> : 'Lưu & Kết nối'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
