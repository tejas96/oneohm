'use client';

import * as React from 'react';

import { signedPercent } from '../lib/format';

import { color } from '@/lib/theme/tokens';

/**
 * The backend's comparison shape. `new` means there was no comparable value in
 * the previous period, so no percentage is meaningful — see
 * `computeTrendMetric`, which deliberately refuses to fabricate "+100%".
 */
export interface TrendMetric {
  value: number;
  direction: 'up' | 'down' | 'flat' | 'new';
}

interface TrendChipProps {
  metric: TrendMetric | undefined;
  /**
   * False for the sales cycle: a SHORTER cycle is an improvement, so a fall
   * reads green. Painting every improvement red is the easiest mistake on a
   * metrics screen.
   */
  upIsGood?: boolean;
}

/**
 * Colours come from `lib/theme/tokens` rather than Tailwind's `text-success`,
 * which maps to `success-main` (#22C55E) — the vivid chart FILL, not the
 * readable foreground (#15803D) this is text in.
 */
export function TrendChip({ metric, upIsGood = true }: TrendChipProps): React.JSX.Element | null {
  if (!metric) return null;

  // No baseline. Say so instead of rendering a meaningless "+0.0%".
  if (metric.direction === 'new') {
    return <span className="text-[11.5px] text-foreground-tertiary">new</span>;
  }

  if (metric.direction === 'flat' || metric.value === 0) {
    return <span className="text-[11.5px] tabular-nums text-foreground-tertiary">no change</span>;
  }

  const up = metric.value >= 0;
  const good = up === upIsGood;

  return (
    <span
      className="inline-flex items-center gap-[3px] text-[11.5px] font-medium tabular-nums"
      style={{ color: good ? color.success : color.danger }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={up ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'}
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {signedPercent(metric.value)}
    </span>
  );
}
