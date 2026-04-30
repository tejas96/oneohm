'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Compact cell-sized progress bar tuned for use inside data tables —
 * shows fill ratio + the underlying numerator/denominator label in one
 * line. Used by:
 *   * PO list: receivedQuantity / orderedQuantity per line
 *   * Allocation list: dispatchedQuantity / allocatedQuantity
 *   * Stock list: availableQuantity / minimumStockLevel inverted
 *
 * Why not the existing `ui/progress` component: that one is a single
 * progress track with no inline label, and it's tuned for full-width
 * page contexts (forms, wizards). Squeezing it into a 120px table cell
 * hides the numbers, which is the primary thing operators look at.
 *
 * Colour rules:
 *   * < 25%   -> error
 *   * 25..75% -> warning
 *   * >= 75%  -> success
 *   * exactly 100% renders as success regardless
 *
 * Pass `intent: 'inverted'` to flip the rules (e.g. for stock-deficit
 * cells where 100% means "completely depleted").
 */

export type ProgressBarIntent = 'auto' | 'auto-inverted' | 'success' | 'warning' | 'danger' | 'info';

export interface ProgressBarCellProps {
  numerator: number;
  denominator: number;
  /** Optional override label. Defaults to `${numerator} / ${denominator}`. */
  label?: string;
  /** Hide the numeric label and show only the bar (useful in dense tables). */
  hideLabel?: boolean;
  intent?: ProgressBarIntent;
  className?: string;
}

const INTENT_BG: Record<Exclude<ProgressBarIntent, 'auto' | 'auto-inverted'>, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-error',
  info: 'bg-info',
};

function resolveAutoIntent(percent: number, inverted: boolean): keyof typeof INTENT_BG {
  if (percent >= 100) return inverted ? 'danger' : 'success';
  if (percent >= 75) return inverted ? 'danger' : 'success';
  if (percent >= 25) return 'warning';
  return inverted ? 'success' : 'danger';
}

export function ProgressBarCell({
  numerator,
  denominator,
  label,
  hideLabel,
  intent = 'auto',
  className,
}: ProgressBarCellProps): React.JSX.Element {
  const percent = denominator > 0 ? Math.min(100, Math.max(0, (numerator / denominator) * 100)) : 0;
  const resolvedIntent =
    intent === 'auto'
      ? resolveAutoIntent(percent, false)
      : intent === 'auto-inverted'
        ? resolveAutoIntent(percent, true)
        : intent;

  const renderedLabel = label ?? `${numerator} / ${denominator}`;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {!hideLabel && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-foreground-secondary tabular-nums">{renderedLabel}</span>
          <span className="text-foreground-tertiary tabular-nums">{Math.round(percent)}%</span>
        </div>
      )}
      <div className="h-progress-sm w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-[width] duration-fast', INTENT_BG[resolvedIntent])}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={renderedLabel}
        />
      </div>
    </div>
  );
}

ProgressBarCell.displayName = 'ProgressBarCell';
