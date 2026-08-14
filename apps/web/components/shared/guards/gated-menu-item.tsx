'use client';

import { MenuItem, type MenuItemProps } from '@mui/material';
import type { ReactNode } from 'react';

import { useGatedAction, type Gate } from '@/lib/rbac';

interface GatedMenuItemProps extends Omit<MenuItemProps, 'onClick' | 'children'> {
  /** What the user needs to run this item. */
  permission: Gate;
  /** What to do when they may. */
  onAction: () => void;
  /** Name shown in the access dialog, e.g. "Delete property". */
  subject?: string;
  children: ReactNode;
}

/**
 * A row-menu action that explains itself when blocked.
 *
 * MUI's `disabled` swallows clicks, so a disabled MenuItem would be a dead row
 * with no explanation. This keeps the item clickable and marks it
 * `aria-disabled` instead, so clicking opens the access dialog and names the
 * missing permission.
 *
 * Row menus matter more than page buttons here: they sit on list pages a user
 * is legitimately allowed to open, so they are the most likely place someone
 * meets a permission boundary.
 *
 * Children are rendered untouched — they already carry their own
 * `ListItemIcon`, and a second icon would fight it for space.
 */
export function GatedMenuItem({
  permission,
  onAction,
  subject,
  children,
  sx,
  ...rest
}: GatedMenuItemProps): React.JSX.Element {
  const { allowed, onGatedClick } = useGatedAction(permission, onAction, subject);

  return (
    <MenuItem
      {...rest}
      onClick={onGatedClick}
      aria-disabled={!allowed}
      sx={allowed ? sx : [{ opacity: 0.45 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </MenuItem>
  );
}
