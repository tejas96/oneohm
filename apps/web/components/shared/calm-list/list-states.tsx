'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Button } from '@mui/material';
import type { JSX, ReactNode } from 'react';

/** "Failed to load customers" with the server's reason and a way to try again. */
export function ListError({
  title,
  message,
  onRetry,
}: {
  title: string;
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
        <div className="text-[14px] font-semibold text-error">{title}</div>
        <div className="text-[12px] text-foreground-secondary">{message}</div>
      </div>
      <Button variant="outlined" color="error" size="small" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/** Nothing to show: a title, one line of help, and the one useful next step. */
export function ListEmpty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-rf-xl bg-surface px-5 py-14 text-center shadow-e1">
      <div className="text-[14px] font-semibold">{title}</div>
      {hint ? <div className="text-[13px] text-foreground-secondary">{hint}</div> : null}
      {action}
    </div>
  );
}
