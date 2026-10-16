import { useContext, useEffect, type PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { AppBarSlotContext } from './appBarSlotContext';

/** Puts page navigation (e.g. a breadcrumb) in the app bar, in place of the workspace title. */
export function AppBarSlot({ children }: PropsWithChildren): JSX.Element | null {
  const slot = useContext(AppBarSlotContext);
  const register = slot?.register;

  useEffect(() => register?.(), [register]);

  if (!slot) return <>{children}</>;
  return slot.node ? createPortal(children, slot.node) : null;
}
