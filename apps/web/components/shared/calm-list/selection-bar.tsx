'use client';

import { Button } from '@mui/material';
import type { JSX, ReactNode } from 'react';

import { CloseIcon } from './icons';

/**
 * What is ticked, and what can be done with it: a pill that floats at the foot
 * of the window while any row is ticked. It floats rather than sitting above
 * the rows so ticking a row never moves the row under the pointer.
 */
export function SelectionBar({
  label,
  onClear,
  children,
}: {
  /** "3 follow-ups selected". */
  label: string;
  onClear: () => void;
  /** The actions, as buttons. */
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
      <div
        role="region"
        aria-label="Selected rows"
        className="pointer-events-auto flex animate-calm-rise items-center gap-2.5 rounded-pill bg-surface py-2 pl-5 pr-2 shadow-[var(--shadow-e5)] [--calm-rise-y:6px] [animation-duration:250ms] motion-reduce:animate-none"
      >
        <span aria-live="polite" className="whitespace-nowrap text-[14px] font-medium">
          {label}
        </span>
        {children}
        <Button
          size="small"
          color="inherit"
          onClick={onClear}
          aria-label="Clear selection"
          className="min-w-0 rounded-full p-1.5 text-foreground-secondary"
        >
          <CloseIcon size={16} />
        </Button>
      </div>
    </div>
  );
}
