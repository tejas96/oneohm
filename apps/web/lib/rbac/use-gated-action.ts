'use client';

import { useCallback } from 'react';

import { useAccessDialog } from './access-dialog';
import type { Gate } from './catalog';
import { useCan } from './use-can';

export interface GatedAction {
  /** Whether the user may actually perform this. */
  allowed: boolean;
  /** Wire this to the control's onClick — it runs the action or explains the block. */
  onGatedClick: () => void;
}

/**
 * Gate a data-changing control.
 *
 * The returned handler runs the real action when allowed, and opens the access
 * dialog when not.
 *
 * **Do not pass `allowed` to a `disabled` prop.** A genuinely disabled button
 * swallows clicks, so the dialog would never open and the user would be left
 * with a dead control and no explanation — the exact problem this design
 * exists to avoid. Mark it `aria-disabled` and mute it visually instead; the
 * click must still land.
 *
 * @example
 * const { allowed, onGatedClick } = useGatedAction('customers.create', openForm, 'Add customer');
 * <Button onClick={onGatedClick} aria-disabled={!allowed} className={cn(!allowed && 'opacity-50')}>
 *   Add customer
 * </Button>
 */
export function useGatedAction(gate: Gate, action: () => void, subject?: string): GatedAction {
  const { can } = useCan();
  const { requestAccess } = useAccessDialog();
  const allowed = can(gate);

  const onGatedClick = useCallback(() => {
    if (allowed) {
      action();
      return;
    }
    requestAccess(gate, subject);
  }, [allowed, action, requestAccess, gate, subject]);

  return { allowed, onGatedClick };
}
