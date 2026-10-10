'use client';

import { ListItemIcon, Menu, MenuItem } from '@mui/material';
import { type JSX, useState } from 'react';

import { CheckIcon, SortIcon } from './icons';

import type { TableUrlSortModel } from '@/lib/hooks';

export interface SortOption {
  label: string;
  /** null is the list's default order and keeps the sort out of the URL. */
  model: TableUrlSortModel | null;
}

/** The option whose field and direction a sort model names; the first one when none does. */
export function matchSortOption(options: SortOption[], model: TableUrlSortModel | null): number {
  if (!model)
    return Math.max(
      0,
      options.findIndex((option) => option.model === null),
    );
  const index = options.findIndex(
    (option) => option.model?.field === model.field && option.model.direction === model.direction,
  );
  return index === -1 ? 0 : index;
}

export interface SortMenuProps {
  /** What the column headers of the old table offered, as one menu. */
  options: SortOption[];
  sortModel: TableUrlSortModel | null;
  onSortChange: (model: TableUrlSortModel | null) => void;
  /**
   * Which option a model reads as, when plain matching is not enough (a list
   * whose API falls back to a default field for one it does not know).
   */
  activeIndex?: (model: TableUrlSortModel | null) => number;
  className?: string;
}

/** The list's sort, as a button that names the current order and a menu of the rest. */
export function SortMenu({
  options,
  sortModel,
  onSortChange,
  activeIndex,
  className,
}: SortMenuProps): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = activeIndex ? activeIndex(sortModel) : matchSortOption(options, sortModel);

  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl)}
        aria-label={`Sort: ${options[current]?.label}`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        className={className}
      >
        <SortIcon />
        {options[current]?.label}
      </button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 180, mt: 0.75 } } }}
      >
        {options.map((option, index) => (
          <MenuItem
            key={option.label}
            selected={index === current}
            onClick={() => {
              setAnchorEl(null);
              onSortChange(option.model);
            }}
          >
            <ListItemIcon sx={{ color: 'var(--ds-primary-dark)' }}>
              {index === current ? <CheckIcon size={14} strokeWidth={3} /> : null}
            </ListItemIcon>
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
