import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" aria-labelledby="add-source-title">
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <DialogTitle id="add-source-title">Thêm nguồn dữ liệu</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Nhập connection URL của cơ sở dữ liệu (PostgreSQL hoặc MongoDB). URL được mã hóa trên máy chủ, chỉ dùng
              để đọc dữ liệu và không bao giờ hiển thị lại.
            </Typography>

            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tên nguồn"
                  placeholder="VD: CRM khách hàng"
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
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
                  error={Boolean(errors.url)}
                  helperText={errors.url?.message ?? 'postgresql://… hoặc mongodb://… / mongodb+srv://…'}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {engine && <Chip size="small" label={engine === 'postgresql' ? 'PostgreSQL' : 'MongoDB'} />}
                        <IconButton
                          aria-label={showUrl ? 'Ẩn URL' : 'Hiện URL'}
                          onClick={() => setShowUrl((value) => !value)}
                          edge="end"
                        >
                          {showUrl ? <VisibilityOff /> : <Visibility />}
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
                  placeholder="customers, orders"
                  error={Boolean(errors.tables)}
                  helperText={errors.tables?.message ?? 'Ngăn cách bằng dấu phẩy. Để trống để quét tất cả.'}
                  fullWidth
                />
              )}
            />

            {testNote && <Alert severity={testNote.ok ? 'success' : 'error'}>{testNote.message}</Alert>}
            {submitError && <Alert severity="error">{submitError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={() => void handleTest()} disabled={busy} variant="outlined">
            {testSource.isPending ? <CircularProgress size={20} /> : 'Kiểm tra kết nối'}
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {createSource.isPending ? <CircularProgress size={20} color="inherit" /> : 'Lưu nguồn'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
