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
 * The three line edits, behind one control on every row.
 *
 * Three inline buttons per row would triple the table's visual weight for
 * actions used a handful of times per project, so they live behind one menu.
 * That menu is always visible, though: it was hover-only, which kept the table
 * quiet at the cost of the rows never looking editable at all — you had to
 * already know to go looking. A single muted 28px glyph is a price worth paying
 * for the table saying what it can do.
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
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-fast hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
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
