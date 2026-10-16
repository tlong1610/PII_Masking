import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { NotificationContext, type Notify } from './notificationContext';

interface Notification {
  key: number;
  message: string;
  severity: AlertColor;
}

/** Shows short, non-blocking feedback (toast) in place of window.alert. */
export function NotificationProvider({ children }: PropsWithChildren): JSX.Element {
  const [current, setCurrent] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback<Notify>((message, severity = 'success') => {
    setCurrent({ key: Date.now(), message, severity });
    setOpen(true);
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        key={current?.key}
        open={open}
        autoHideDuration={current?.severity === 'error' ? 8000 : 4000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setOpen(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {current ? (
          <Alert
            severity={current.severity}
            variant="filled"
            onClose={() => setOpen(false)}
            sx={{ minWidth: 320, maxWidth: 480, boxShadow: 3, whiteSpace: 'pre-line' }}
          >
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  );
}
