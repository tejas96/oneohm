'use client';

import { Menu, MenuItem } from '@mui/material';
import { MoreVertical } from 'lucide-react';
import { useState, type JSX } from 'react';

export interface TaskRowActionsProps {
  /** Used only for the accessible label — the task this menu belongs to. */
  taskName: string;
  onDelete: () => void;
}

/**
 * The row-level actions on a project task, behind one control.
 *
 * Deleting is the only one today, and an inline delete button on every row
 * would shout louder than an action used a handful of times per project. The
 * menu stays visible rather than hover-only, so a row says what it can do —
 * the same call `BomRowActions` makes one tab over.
 *
 * Every handler stops propagation: the row itself is a button that opens the
 * task drawer, and opening a menu must not open the drawer behind it.
 */
export function TaskRowActions({ taskName, onDelete }: TaskRowActionsProps): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label={`Actions for ${taskName}`}
        aria-expanded={Boolean(anchorEl)}
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-fast hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        <MoreVertical className="size-4" />
      </button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { borderRadius: 'var(--radius-rf-lg)', mt: 0.5 } } }}
      >
        <MenuItem
          dense
          sx={{ color: 'error.main' }}
          onClick={() => {
            setAnchorEl(null);
            onDelete();
          }}
        >
          Delete task
        </MenuItem>
      </Menu>
    </>
  );
}
