import type { FocusEvent } from 'react';

/**
 * Did this blur mean the person left the field?
 *
 * Yes when focus moved to something else inside the same dialog — another
 * field, or the dialog's own frame, which is where focus lands when someone
 * clicks a disabled Submit (exactly when "enter an amount" must show) — or to
 * nothing at all. No when focus left the dialog entirely: that is the dialog's
 * own focus handling, not a person. MUI's focus trap hands focus back to the
 * button that opened it when its effect re-runs, which React does on every
 * mount in development, and treating that as "touched" put a red error on an
 * empty field the moment a money dialog opened.
 *
 * The modal root, not `[role="dialog"]`: the frame focus lands on sits outside
 * the paper that carries the role.
 */
export function blurStayedInDialog(event: FocusEvent<HTMLElement>): boolean {
  const next = event.relatedTarget as Node | null;
  if (!next) return true;
  // Two lookups, not one selector list: `closest` returns the NEAREST match of
  // any selector, which is the paper, and the frame is outside the paper.
  const modal =
    event.currentTarget.closest('.MuiModal-root') ?? event.currentTarget.closest('[role="dialog"]');
  return Boolean(modal?.contains(next));
}
