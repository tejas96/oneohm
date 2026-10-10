'use client';

import type { JSX, ReactNode } from 'react';

import { cn, formatNumber } from '@/lib/utils';

export interface SegmentProps {
  pressed: boolean;
  onClick: () => void;
  /**
   * The number in front of the label. `undefined` is "still loading" and shows
   * a dash; `null` is "this view has no number" and shows the label alone.
   */
  count: number | undefined | null;
  label: string;
  /** What a screen reader hears in place of "900 need follow-up". */
  name?: string;
  /** A CSS colour for the leading dot. */
  dot?: string;
  /** A count that wants attention reads in the danger colour. */
  warn?: boolean;
  title?: string;
}

/** One quick view of a list: a number and its label, dark while it is the one applied. */
export function Segment({
  pressed,
  onClick,
  count,
  label,
  name = label,
  dot,
  warn,
  title,
}: SegmentProps): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={typeof count === 'number' ? `${name}: ${formatNumber(count)}` : name}
      title={title}
      onClick={onClick}
      className={cn(
        'flex items-baseline gap-2 rounded-rf-lg px-3.5 py-2 transition-colors duration-200 motion-reduce:transition-none',
        pressed ? 'bg-foreground text-white' : 'hover:bg-background-tertiary',
      )}
    >
      {dot ? (
        <i className="block size-2 self-center rounded-full" style={{ background: dot }} />
      ) : null}
      {count === null ? null : (
        <span
          className={cn(
            'text-[18px] font-semibold tabular-nums',
            warn && !pressed && 'text-error',
            count === undefined && 'text-foreground-muted',
          )}
        >
          {count === undefined ? '–' : formatNumber(count)}
        </span>
      )}
      <span
        className={cn(
          count === null ? 'text-[14px] font-medium' : 'text-[13px]',
          pressed
            ? count === null
              ? 'text-white'
              : 'text-white/70'
            : count === null
              ? 'text-foreground'
              : 'text-foreground-secondary',
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** The white card a list's quick views sit in, under the title. */
export function SegmentCard({
  label,
  children,
  className,
}: {
  /** Names the group for a screen reader: "Projects by status". */
  label: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <section
      aria-label={label}
      className={cn('rounded-card-calm bg-surface px-[22px] py-3.5 shadow-calm', className)}
    >
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </section>
  );
}
