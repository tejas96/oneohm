'use client';

import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import { IconButton } from '@mui/material';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Per-row action menu used inside `AdvancedTable` rows. Built on MUI
 * because the .cursorrules file says new components must use MUI for
 * primitives — the existing `ui/dropdown-menu.tsx` (Radix) is
 * deprecated for new code, even if it's still rendered elsewhere.
 *
 * Behaviour:
 *   * Closes on action select (caller's `onSelect` runs first).
 *   * Stops the click event propagation on the trigger so the menu
 *     opening doesn't also bubble into the row's onClick (a real
 *     issue when rows are clickable for navigation).
 *   * Each action can be `disabled` (e.g. PO already approved). The
 *     `tooltip` prop surfaces *why* it's disabled when the user
 *     hovers — important UX hint that the table makes harder to do
 *     with a generic disabled state.
 *   * `intent='destructive'` styles the action red and is
 *     conventionally placed last with a separator above it.
 */

export interface RowAction {
  id: string;
  label: string;
  /** Optional MUI icon component (rendered to the left). */
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Hover tooltip — useful for explaining why an action is disabled. */
  tooltip?: string;
  intent?: 'default' | 'destructive';
}

export interface RowActionMenuProps {
  actions: ReadonlyArray<RowAction>;
  /** Optional aria-label for the trigger button. */
  ariaLabel?: string;
  className?: string;
  /** Render no menu at all if every action is disabled or list is empty. Defaults to true. */
  hideWhenAllDisabled?: boolean;
}

export function RowActionMenu({
  actions,
  ariaLabel = 'Row actions',
  className,
  hideWhenAllDisabled = true,
}: RowActionMenuProps): React.JSX.Element | null {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const allDisabled = actions.every((action) => action.disabled);
  if (hideWhenAllDisabled && (actions.length === 0 || allDisabled)) {
    return null;
  }

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    event.preventDefault();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleSelect = (action: RowAction, event: React.MouseEvent): void => {
    event.stopPropagation();
    if (action.disabled) return;
    handleClose();
    action.onSelect();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn('!p-1', className)}
      >
        <MoreVertRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        {actions.map((action, index) => {
          const isDestructive = action.intent === 'destructive';
          const prevIsDestructive = actions[index - 1]?.intent === 'destructive';
          const showDividerAbove = isDestructive && !prevIsDestructive && index > 0;
          return (
            <React.Fragment key={action.id}>
              {showDividerAbove && <Divider component="li" />}
              <MenuItem
                onClick={(event) => handleSelect(action, event)}
                disabled={action.disabled}
                title={action.tooltip}
                sx={{
                  fontSize: 13,
                  ...(isDestructive && { color: 'error.main' }),
                }}
              >
                {action.icon && (
                  <ListItemIcon
                    sx={{ minWidth: '28px !important', color: isDestructive ? 'error.main' : undefined }}
                  >
                    {action.icon}
                  </ListItemIcon>
                )}
                <ListItemText
                  primary={action.label}
                  primaryTypographyProps={{ fontSize: 13 }}
                />
              </MenuItem>
            </React.Fragment>
          );
        })}
      </Menu>
    </>
  );
}

RowActionMenu.displayName = 'RowActionMenu';
