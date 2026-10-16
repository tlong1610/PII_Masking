import { createContext, useContext } from 'react';
import type { AlertColor } from '@mui/material/Alert';

export type Notify = (message: string, severity?: AlertColor) => void;

// Without a provider (isolated component tests) notifications are simply dropped.
export const NotificationContext = createContext<Notify>(() => undefined);

export function useNotify(): Notify {
  return useContext(NotificationContext);
}
