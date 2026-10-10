'use client';

import { ListItemIcon, Menu, MenuItem } from '@mui/material';
import { type JSX, useState } from 'react';

import { CheckIcon, SortIcon } from './icons';

import type { TableUrlSortModel } from '@/lib/hooks';

interface SortOption {
  label: string;
  /** null is the default (newest first) and keeps `customers_sort` out of the URL. */
  model: TableUrlSortModel | null;
}

/**
 * The three sortable fields the old column headers offered, both directions.
 * The models are the same `{ field, direction }` values the headers wrote, so
 * a saved `customers_sort` URL still means what it meant.
 */
const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest first', model: null },
  { label: 'Oldest first', model: { field: 'createdAt', direction: 'asc' } },
  { label: 'Name A–Z', model: { field: 'name', direction: 'asc' } },
  { label: 'Name Z–A', model: { field: 'name', direction: 'desc' } },
  { label: 'City A–Z', model: { field: 'city', direction: 'asc' } },
  { label: 'City Z–A', model: { field: 'city', direction: 'desc' } },
];

const KNOWN_FIELDS = new Set(['createdAt', 'name', 'city']);

/** Which option a sort model reads as. An unknown field sorts as the default does. */
function activeIndex(model: TableUrlSortModel | null): number {
  if (!model || !KNOWN_FIELDS.has(model.field)) return 0;
  if (model.field === 'createdAt' && model.direction !== 'asc') return 0;
  const index = SORT_OPTIONS.findIndex(
    (option) =>
      option.model?.field === model.field &&
      option.model.direction === (model.direction === 'asc' ? 'asc' : 'desc'),
  );
  return index === -1 ? 0 : index;
}

export function SortMenu({
  sortModel,
  onSortChange,
  className,
}: {
  sortModel: TableUrlSortModel | null;
  onSortChange: (model: TableUrlSortModel | null) => void;
  className?: string;
}): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = activeIndex(sortModel);

  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl)}
        aria-label={`Sort: ${SORT_OPTIONS[current]?.label}`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        className={className}
      >
        <SortIcon />
        {SORT_OPTIONS[current]?.label}
      </button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 180, mt: 0.75 } } }}
      >
        {SORT_OPTIONS.map((option, index) => (
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
