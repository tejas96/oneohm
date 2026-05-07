'use client';

import SearchIcon from '@mui/icons-material/Search';
import { InputAdornment, TextField } from '@mui/material';
import * as React from 'react';

export interface LedgerToolbarProps {
  /** Controlled search-input value. Empty string ⇒ field is empty. */
  search: string;
  onSearchChange: (next: string) => void;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /**
   * Slot for filter controls (status select, date-range picker, project
   * picker, etc.). Rendered to the right of the search box.
   */
  filtersSlot?: React.ReactNode;
  /**
   * Slot for trailing actions (CSV export, "New Receipt" button, etc.).
   * Rendered far-right.
   */
  actionsSlot?: React.ReactNode;
  /** Optional className applied to the root flex container. */
  className?: string;
}

/**
 * Sticky-friendly toolbar shared by every ledger page in the Finance
 * module (Receipts, Expenses, Outstanding, Customers AR, Vendors,
 * Profitability). Layout: [search] | [filtersSlot] | [actionsSlot]
 * with consistent spacing + responsive wrap.
 *
 * Stays purely presentational — debouncing, URL-syncing, and React
 * Query invalidation are the parent page's job.
 */
export function LedgerToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filtersSlot,
  actionsSlot,
  className,
}: LedgerToolbarProps): React.JSX.Element {
  return (
    <div
      className={`bg-background border-border-light flex flex-wrap items-center gap-3 border-b px-4 py-3 ${
        className ?? ''
      }`}
    >
      <div className="min-w-[220px] max-w-[320px] flex-1">
        <TextField
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiInputBase-root': { fontSize: 13, height: 32, borderRadius: 1 },
            '& .MuiInputBase-input': { padding: '4px 0' },
          }}
        />
      </div>

      {filtersSlot != null && (
        <div className="flex flex-wrap items-center gap-2">{filtersSlot}</div>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">{actionsSlot}</div>
    </div>
  );
}
