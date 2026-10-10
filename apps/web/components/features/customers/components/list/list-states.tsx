'use client';

import AddIcon from '@mui/icons-material/Add';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Button } from '@mui/material';
import type { JSX } from 'react';

/** "Failed to load customers" with the server's reason and a way to try again. */
export function ListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div
      role="alert"
      className="mb-2.5 flex items-center gap-3 rounded-rf-xl bg-[var(--ds-danger-bg)] px-5 py-4"
    >
      <ErrorOutlineIcon color="error" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-error">Failed to load customers</div>
        <div className="text-[12px] text-foreground-secondary">{message}</div>
      </div>
      <Button variant="outlined" color="error" size="small" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/** Nothing to show — because of the filters, or because there are no customers at all. */
export function ListEmpty({
  filtered,
  onClearFilters,
  onAddCustomer,
  canAddCustomer,
}: {
  filtered: boolean;
  onClearFilters: () => void;
  onAddCustomer: () => void;
  canAddCustomer: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-rf-xl bg-surface px-5 py-14 text-center shadow-e1">
      <div className="text-[14px] font-semibold">
        {filtered ? 'No customers match' : 'No customers yet'}
      </div>
      <div className="text-[13px] text-foreground-secondary">
        {filtered
          ? 'Try another name, phone number or site code.'
          : 'Get started by adding your first customer.'}
      </div>
      {filtered ? (
        <Button size="small" variant="outlined" onClick={onClearFilters} sx={{ mt: 0.5 }}>
          Clear all filters
        </Button>
      ) : (
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ mt: 0.5, opacity: canAddCustomer ? 1 : 0.5 }}
          onClick={onAddCustomer}
          aria-disabled={!canAddCustomer}
        >
          Add customer
        </Button>
      )}
    </div>
  );
}
