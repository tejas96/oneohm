'use client';

import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Dense KPI tile for the inventory dashboard and per-resource list
 * stripes. Distinct from the existing `StatsCard` in components/ui:
 *
 *   * Smaller surface (compact label row + headline number + optional
 *     delta + optional secondary stat) so 8 of these fit in a single
 *     dashboard row.
 *   * Built-in delta indicator with the right semantic colour (green
 *     for positive, red for negative, neutral for zero/null).
 *   * Optional `intent` prop to colour the entire tile when the metric
 *     itself is alarming (e.g. low stock count -> warning).
 *
 * Use `<KpiStripe>` to render a row of these with the right gaps and
 * responsive collapse.
 */

type Intent = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const INTENT_BORDER: Record<Intent, string> = {
  neutral: 'border-border-light',
  success: 'border-success/40',
  warning: 'border-warning/50',
  danger: 'border-error/50',
  info: 'border-info/40',
};

const INTENT_ACCENT: Record<Intent, string> = {
  neutral: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-error',
  info: 'text-info',
};

export interface MetricTileProps {
  label: string;
  /** Pre-formatted display string. Use formatCurrency / formatNumber from lib/utils. */
  value: string | number;
  /**
   * Optional delta vs the previous period. Positive = up arrow + green.
   * Negative = down arrow + red. Zero = dash + neutral grey.
   * Caller decides whether "up" is good or bad — the colours are pure
   * directional, not value-judgement. If you need inverted semantics
   * (e.g. low-stock count where down is good), pass `invertDelta`.
   */
  delta?: number | null;
  /** Optional formatted delta label (e.g. "+12%"). If absent we render the raw delta number with a sign. */
  deltaLabel?: string;
  /** Treat negative deltas as "good" (green) and positive as "bad" (red). */
  invertDelta?: boolean;
  /** Optional secondary metric shown small under the value (e.g. "of 1,200 total"). */
  secondary?: string;
  /** Visually colour the tile based on the metric's status. Defaults to 'neutral'. */
  intent?: Intent;
  /** Click handler for drill-through; if absent the tile is non-interactive. */
  onClick?: () => void;
  /** Show a skeleton instead of the content. */
  isLoading?: boolean;
  /** Render an empty-state-friendly version when there is no data yet. */
  isEmpty?: boolean;
  className?: string;
}

export function MetricTile({
  label,
  value,
  delta,
  deltaLabel,
  invertDelta = false,
  secondary,
  intent = 'neutral',
  onClick,
  isLoading,
  isEmpty,
  className,
}: MetricTileProps): React.JSX.Element {
  const isInteractive = Boolean(onClick);
  const Component = isInteractive ? 'button' : 'div';

  const deltaIsZero = delta === 0 || delta === null || delta === undefined;
  const goodDirection = invertDelta ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  const deltaColour = deltaIsZero
    ? 'text-foreground-tertiary'
    : goodDirection
      ? 'text-success'
      : 'text-error';
  const DeltaIcon = deltaIsZero
    ? RemoveRoundedIcon
    : delta > 0
      ? ArrowUpwardRoundedIcon
      : ArrowDownwardRoundedIcon;

  const renderedDeltaLabel = (() => {
    if (deltaLabel !== undefined) return deltaLabel;
    if (delta === undefined || delta === null) return null;
    if (delta === 0) return '0';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta}`;
  })();

  return (
    <Component
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-1.5 rounded-xl border bg-surface p-card text-left transition-colors',
        INTENT_BORDER[intent],
        isInteractive &&
          'cursor-pointer hover:border-foreground-muted/50 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        className,
      )}
    >
      <span className="text-2xs font-medium uppercase tracking-wide text-foreground-tertiary">
        {label}
      </span>

      {isLoading ? (
        <Skeleton className="h-7 w-20" />
      ) : isEmpty ? (
        <span className="text-2xl font-semibold text-foreground-tertiary">—</span>
      ) : (
        <span className={cn('text-2xl font-semibold leading-tight', INTENT_ACCENT[intent])}>
          {value}
        </span>
      )}

      {(secondary || renderedDeltaLabel !== null) && !isLoading && (
        <div className="flex items-center gap-2 text-xs">
          {renderedDeltaLabel !== null && (
            <span className={cn('flex items-center gap-0.5 font-medium', deltaColour)}>
              <DeltaIcon sx={{ fontSize: 12 }} />
              {renderedDeltaLabel}
            </span>
          )}
          {secondary && <span className="text-foreground-tertiary">{secondary}</span>}
        </div>
      )}
    </Component>
  );
}

MetricTile.displayName = 'MetricTile';
