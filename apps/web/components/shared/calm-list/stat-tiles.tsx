import type { JSX, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** The colour a figure reads in. Plain unless the number itself is the news. */
export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASS: Record<StatTone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-error',
  info: 'text-info',
};

/** The row of figures under a page's title. */
export function StatTiles({
  label,
  children,
  className,
}: {
  /** Names the group for a screen reader: "Payables totals". */
  label: string;
  children: ReactNode;
  /** The grid's columns at each width (`sm:grid-cols-3`). */
  className?: string;
}): JSX.Element {
  return (
    <dl aria-label={label} className={cn('m-0 grid items-start gap-2.5', className)}>
      {children}
    </dl>
  );
}

/** One figure: what it is, the number, and one line that says what it covers. */
export function StatTile({
  label,
  value,
  note,
  tone = 'default',
  compact = false,
  linked = false,
  below,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: StatTone;
  /** For a strip of five: a smaller figure and less padding, so a crore still fits. */
  compact?: boolean;
  /** The tile sits inside a link: it answers the pointer. */
  linked?: boolean;
  /** Something that belongs with this figure and sits under its card (a note that filters). */
  below?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className={cn(
          'rounded-card-calm bg-surface py-4 shadow-calm',
          compact ? 'px-3 sm:px-4' : 'px-[22px]',
          linked &&
            'transition-colors duration-200 hover:bg-background-tertiary motion-reduce:transition-none',
        )}
      >
        <dt className="text-[12px] font-medium text-foreground-tertiary">{label}</dt>
        <dd
          // An amount is never cut short: a figure too long for its tile wraps.
          className={cn(
            'm-0 mt-1 font-semibold leading-[1.3] tracking-[-0.01em] tabular-nums [overflow-wrap:anywhere]',
            // Two to a row on a phone: small enough that a crore stays on one line.
            compact ? 'text-[15px] sm:text-[18px]' : 'text-[22px]',
            TONE_CLASS[tone],
          )}
        >
          {value}
        </dd>
        {note ? <dd className="m-0 mt-0.5 text-[12px] text-foreground-tertiary">{note}</dd> : null}
      </div>
      {below}
    </div>
  );
}
