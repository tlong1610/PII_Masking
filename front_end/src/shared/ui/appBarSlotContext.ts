import { createContext } from 'react';

export interface AppBarSlotValue {
  /** Element in the app bar that page content is portalled into. */
  node: HTMLElement | null;
  /** Marks the slot as used (hiding the default workspace title); returns the cleanup. */
  register: () => () => void;
}

/** Null outside AppShell: the slot content then renders where it is declared. */
export const AppBarSlotContext = createContext<AppBarSlotValue | null>(null);
