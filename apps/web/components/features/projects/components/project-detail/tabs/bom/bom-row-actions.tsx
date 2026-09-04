'use client';

import { Menu, MenuItem } from '@mui/material';
import { MoreVertical } from 'lucide-react';
import { useState, type JSX } from 'react';

import type { BomLineEditMode } from './bom-line-edit-dialog';

export interface BomRowActionsProps {
  /** Used only for the accessible label — the row this menu belongs to. */
  productName: string;
  /** A line already at zero has nothing left to change. */
  removed: boolean;
  onPick: (mode: BomLineEditMode) => void;
}

/**
 * The three line edits, behind one control that stays invisible until the row
 * is hovered or the button is focused.
 *
 * The table already carries eight columns of numbers and pills. Three inline
 * buttons per row would triple its visual weight for actions used a handful of
 * times per project, so the resting state costs one transparent 28px square and
 * the menu carries everything.
 *
 * `opacity-0` rather than `hidden`: the button stays in the layout and stays
 * reachable by keyboard, and `focus-visible:opacity-100` brings it back for
 * anyone tabbing through. `group-hover` is driven by the row.
 */
export function BomRowActions({
  productName,
  removed,
  onPick,
}: BomRowActionsProps): JSX.Element | null {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Nothing sensible to do to a line that is already at zero: its quantity is
  // the removal, replacing it would resurrect it by the back door, and removing
  // it again is a no-op the server already answers with a zero-cost change.
  if (removed) return null;

  const pick = (mode: BomLineEditMode) => () => {
    setAnchorEl(null);
    onPick(mode);
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Edit ${productName}`}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-foreground-tertiary opacity-0 transition-[opacity,background-color,color] duration-fast hover:bg-surface hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary group-hover:opacity-100 aria-expanded:opacity-100"
        aria-expanded={Boolean(anchorEl)}
      >
        <MoreVertical className="size-4" />
      </button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: 'var(--radius-rf-lg)', mt: 0.5 } } }}
      >
        <MenuItem dense onClick={pick('quantity')}>
          Change quantity
        </MenuItem>
        <MenuItem dense onClick={pick('replace')}>
          Replace item
        </MenuItem>
        <MenuItem dense onClick={pick('remove')}>
          Remove line
        </MenuItem>
      </Menu>
    </>
  );
}
