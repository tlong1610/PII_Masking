import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api/client';
import { StatusChip } from '@/shared/ui';
import { useCreateDataSource, useTestDataSource } from '../hooks/usePiiReview';
import { detectEngine, sourceFormSchema, type SourceFormValues } from '../model/sourceForm';

interface AddSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (sourceId: string) => void;
}

const DEFAULT_VALUES: SourceFormValues = { name: '', url: '', namespace: '' };

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
}

export function AddSourceDialog({ open, onClose, onCreated }: AddSourceDialogProps): JSX.Element {
  const [showUrl, setShowUrl] = useState(false);
  const [testNote, setTestNote] = useState<{ ok: boolean; message: string } | null>(null);
  // Schemas/databases found by "Kiểm tra kết nối"; null until a successful test for the current URL.
  const [namespaceOptions, setNamespaceOptions] = useState<{ url: string; names: string[] } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const testSource = useTestDataSource();
  const createSource = useCreateDataSource();

  const {
    control,
    handleSubmit,
    getValues,
    trigger,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SourceFormValues>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  });

  const url = watch('url');
  const engine = detectEngine(url);
  const namespaces = namespaceOptions && namespaceOptions.url === url ? namespaceOptions.names : null;
  const busy = testSource.isPending || createSource.isPending;

  const toInput = (values: SourceFormValues) => ({
    name: values.name,
    url: values.url,
    namespace: values.namespace,
    // Tables are chosen per scan on the "Chọn phạm vi" step, from the source's real table list.
    tables: [],
  });

  const handleClose = (): void => {
    if (busy) return;
    reset(DEFAULT_VALUES);
    setTestNote(null);
    setNamespaceOptions(null);
    setSubmitError(null);
    setShowUrl(false);
    onClose();
  };

  const handleTest = async (): Promise<void> => {
    setSubmitError(null);
    setTestNote(null);
    if (!(await trigger())) return;
    try {
      const values = getValues();
      const result = await testSource.mutateAsync(toInput(values));
      setTestNote({ ok: result.ok, message: result.message });
      if (result.ok && result.namespaces.length > 0) {
        setNamespaceOptions({ url: values.url, names: result.namespaces });
        if (!result.namespaces.includes(values.namespace)) {
          setValue('namespace', result.default_namespace || (result.namespaces[0] ?? ''));
        }
      }
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
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <DialogTitle
          id="add-source-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" component="span">
            <StorageOutlinedIcon color="primary" />
            <span>Thêm nguồn dữ liệu</span>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={busy} aria-label="Đóng">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pb: 3, '.MuiDialogTitle-root + &': { pt: 2.5 } }}>
          <Stack spacing={2.5}>
            <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
              URL kết nối được mã hóa trước khi lưu trên máy chủ nội bộ. Hệ thống chỉ đọc metadata và schema, không bao giờ
              lưu hoặc truyền dữ liệu thô.
            </Alert>

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
                  label="URL kết nối"
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
                          <Box component="span" sx={{ mr: 0.5 }}>
                            <StatusChip
                              label={engine === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
                              tone={engine === 'postgresql' ? 'info' : 'success'}
                            />
                          </Box>
                        )}
                        <IconButton
                          aria-label={showUrl ? 'Ẩn URL' : 'Hiện URL'}
                          onClick={() => setShowUrl((value) => !value)}
                          edge="end"
                          size="small"
                        >
                          {showUrl ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
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
              render={({ field }) =>
                namespaces ? (
                  <TextField
                    {...field}
                    select
                    label={engine === 'mongodb' ? 'Database' : 'Schema'}
                    helperText={`${namespaces.length} ${engine === 'mongodb' ? 'database' : 'schema'} tìm thấy trên nguồn.`}
                    size="small"
                    fullWidth
                  >
                    {namespaces.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    {...field}
                    label={engine === 'mongodb' ? 'Database (tùy chọn)' : 'Schema (tùy chọn)'}
                    placeholder={engine === 'mongodb' ? 'Mặc định lấy từ URL' : 'Mặc định: public'}
                    error={Boolean(errors.namespace)}
                    helperText={
                      errors.namespace?.message ??
                      `Bấm "Kiểm tra kết nối" để chọn từ danh sách ${engine === 'mongodb' ? 'database' : 'schema'} có trên nguồn. Để trống = ${
                        engine === 'mongodb' ? 'database trong URL' : 'search_path trong URL, nếu không có thì public'
                      }.`
                    }
                    size="small"
                    fullWidth
                  />
                )
              }
            />

            <Alert severity="info" variant="outlined" icon={false} sx={{ py: 0 }}>
              Chọn bảng hoặc collection cần quét ở bước tiếp theo (<strong>Chọn phạm vi</strong>), từ danh sách thật lấy
              từ nguồn sau khi kết nối.
            </Alert>

            {testNote && (
              <Alert severity={testNote.ok ? 'success' : 'error'}>
                {testNote.message}
              </Alert>
            )}
            {submitError && (
              <Alert severity="error">
                {submitError}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleClose} disabled={busy} variant="text" color="inherit" sx={{ mr: 'auto' }}>
            Hủy
          </Button>
          <Button
            onClick={() => void handleTest()}
            disabled={busy}
            variant="outlined"
            startIcon={testSource.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Kiểm tra kết nối
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            startIcon={createSource.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Lưu & kết nối
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
