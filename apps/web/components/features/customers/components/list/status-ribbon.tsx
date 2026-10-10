'use client';

import { CustomerStatus } from '@tejas96/shared/types';
import { type JSX, useEffect, useState } from 'react';

import type { CustomerStatsResponse } from '../../hooks/use-customers';

import { cn, formatNumber, toTitleLabel } from '@/lib/utils';

/** One fill per status. Pastels are fills only; the label carries the meaning. */
const STATUS_FILL: Record<CustomerStatus, string> = {
  [CustomerStatus.LEAD]: 'var(--ds-neutral-300)',
  [CustomerStatus.PROSPECT]: 'var(--ds-info-soft)',
  [CustomerStatus.ACTIVE]: 'var(--ds-primary)',
  [CustomerStatus.INACTIVE]: 'var(--ds-neutral-400)',
  [CustomerStatus.LOST]: 'var(--ds-danger-soft)',
};

const STATUSES = Object.values(CustomerStatus);

/** A status with even one customer stays visible on the bar. */
const MIN_SEGMENT_PERCENT = 1.2;

export type RibbonWorklist = '' | 'needs-followup' | 'active-tickets';

interface SegmentProps {
  pressed: boolean;
  onClick: () => void;
  count: number | undefined;
  label: string;
  /** What a screen reader hears in place of "900 need follow-up". */
  name: string;
  dot?: string;
  warn?: boolean;
  title?: string;
}

function Segment({
  pressed,
  onClick,
  count,
  label,
  name,
  dot,
  warn,
  title,
}: SegmentProps): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={count === undefined ? name : `${name}: ${formatNumber(count)}`}
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
      <span
        className={cn(
          'text-[18px] font-semibold tabular-nums',
          warn && !pressed && 'text-error',
          count === undefined && 'text-foreground-muted',
        )}
      >
        {count === undefined ? '–' : formatNumber(count)}
      </span>
      <span className={cn('text-[13px]', pressed ? 'text-white/70' : 'text-foreground-secondary')}>
        {label}
      </span>
    </button>
  );
}

export interface StatusRibbonProps {
  /** Per-status counts; undefined while they load. */
  stats: CustomerStatsResponse | undefined;
  needsFollowupCount: number | undefined;
  activeTicketsCount: number | undefined;
  /**
   * The `status` filter value as it is in the URL, '' for none. Not narrowed to
   * the enum: a hand-edited value that is no status highlights nothing — "All"
   * is pressed only when there is no status filter at all.
   */
  activeStatus: string;
  activeWorklist: RibbonWorklist;
  onStatusChange: (status: string) => void;
  onWorklistChange: (worklist: RibbonWorklist) => void;
}

/**
 * The status chips as one bar and a row of big numbers.
 *
 * Every button writes the same filter field its chip used to: a status sets
 * `filters.status`, "All" clears it, and the two worklists on the right are
 * mutually exclusive and toggle off on a second press (they replace the old
 * "All customers" chip, whose only job was to leave a worklist).
 */
export function StatusRibbon({
  stats,
  needsFollowupCount,
  activeTicketsCount,
  activeStatus,
  activeWorklist,
  onStatusChange,
  onWorklistChange,
}: StatusRibbonProps): JSX.Element {
  const total = stats ? STATUSES.reduce((sum, status) => sum + (stats[status] ?? 0), 0) : undefined;

  // The bar grows from nothing once, when the counts arrive; later it tweens.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!stats || grown) return undefined;
    const timer = setTimeout(() => setGrown(true), 40);
    return () => clearTimeout(timer);
  }, [stats, grown]);

  return (
    <section
      aria-label="Customers by status"
      className="rounded-card-calm bg-surface px-[22px] pb-4 pt-5 shadow-calm"
    >
      <div
        aria-hidden="true"
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-pill bg-background-tertiary"
      >
        {STATUSES.map((status) => {
          const count = stats?.[status] ?? 0;
          const share = total
            ? Math.max((count / total) * 100, count ? MIN_SEGMENT_PERCENT : 0)
            : 0;
          return (
            <i
              key={status}
              className="block h-full rounded-pill [transition:width_1.1s_var(--ease-calm),opacity_0.3s] motion-reduce:[transition:none]"
              style={{
                width: `${grown ? share : 0}%`,
                background: STATUS_FILL[status],
                opacity: !activeStatus || activeStatus === String(status) ? 1 : 0.25,
              }}
            />
          );
        })}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <Segment
          pressed={!activeStatus}
          onClick={() => onStatusChange('')}
          count={total}
          label="All"
          name="All statuses"
        />
        {STATUSES.map((status) => (
          <Segment
            key={status}
            pressed={activeStatus === String(status)}
            onClick={() => onStatusChange(status)}
            count={stats?.[status]}
            label={toTitleLabel(status)}
            name={toTitleLabel(status)}
            dot={STATUS_FILL[status]}
          />
        ))}
        <span className="flex-1" />
        <Segment
          pressed={activeWorklist === 'needs-followup'}
          onClick={() =>
            onWorklistChange(activeWorklist === 'needs-followup' ? '' : 'needs-followup')
          }
          count={needsFollowupCount}
          label={needsFollowupCount === 1 ? 'needs follow-up' : 'need follow-up'}
          name="Needs follow-up"
          title="Customers with an open site that has no follow-up planned"
          warn
        />
        <Segment
          pressed={activeWorklist === 'active-tickets'}
          onClick={() =>
            onWorklistChange(activeWorklist === 'active-tickets' ? '' : 'active-tickets')
          }
          count={activeTicketsCount}
          label="with tickets"
          name="Has active tickets"
          title="Customers with an open or in-progress service ticket"
        />
      </div>
    </section>
  );
}
