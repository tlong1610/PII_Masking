import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { cleanDatasetName, DATASET_NAME_MAX } from '../model/datasetName';

type DatasetNameDialogProps = {
  open: boolean;
  title: string;
  confirmLabel: string;
  initialName: string;
  pending?: boolean;
  onConfirm: (name: string) => void;
  onClose: () => void;
};

/** Asks for the dataset name the Analyst will see (list, preview and downloaded file name). */
export function DatasetNameDialog({
  open,
  title,
  confirmLabel,
  initialName,
  pending = false,
  onConfirm,
  onClose,
}: DatasetNameDialogProps): JSX.Element {
  const [name, setName] = useState(initialName);
  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const cleaned = cleanDatasetName(name);
  const error = cleaned.length === 0 ? 'Nhập tên dataset.' : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="dataset-name-dialog-title">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!error) onConfirm(cleaned);
        }}
      >
        <DialogTitle id="dataset-name-dialog-title">{title}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Tên dataset"
            value={name}
            onChange={(event) => setName(event.target.value)}
            inputProps={{ maxLength: DATASET_NAME_MAX }}
            error={Boolean(error)}
            helperText={error ?? 'Analyst sẽ thấy tên này trong danh sách dữ liệu và trong tên file tải về.'}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" variant="contained" disabled={pending || Boolean(error)}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
