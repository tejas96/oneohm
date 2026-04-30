'use client';

import * as React from 'react';

import { MetricTile, type MetricTileProps } from './metric-tile';

import { cn } from '@/lib/utils';


/**
 * Layout primitive that renders a row of `MetricTile`s with the right
 * gaps + responsive collapse. Used at the top of the inventory
 * dashboard and every list/detail page.
 *
 * Layout:
 *   * 1 column on phones (< sm)
 *   * 2 columns on tablets (sm)
 *   * 4 columns at lg
 *   * 8 columns at 2xl when there are many tiles
 *
 * The 8-up breakpoint kicks in only when the caller passes 5+ tiles —
 * for 4 or fewer we cap at 4 columns so the tiles don't shrink to
 * nothing on a desktop. Override with `columns` if needed.
 */

export type KpiStripeColumns = 2 | 3 | 4 | 5 | 6 | 8;

export interface KpiStripeProps {
  /**
   * Tiles to render. Each entry is forwarded to a `MetricTile`. Pass
   * `key` on the parent if you need keyed reconciliation; otherwise
   * the index is used.
   */
  tiles: ReadonlyArray<MetricTileProps & { id?: string }>;
  /** Override the responsive max-columns. Defaults to auto based on count. */
  columns?: KpiStripeColumns;
  className?: string;
}

const COLUMN_CLASSES: Record<KpiStripeColumns, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6',
  8: 'sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8',
};

function pickColumnClass(count: number, override?: KpiStripeColumns): string {
  if (override) return COLUMN_CLASSES[override];
  if (count >= 8) return COLUMN_CLASSES[8];
  if (count >= 5) return COLUMN_CLASSES[5];
  if (count >= 3) return COLUMN_CLASSES[Math.min(count, 4) as KpiStripeColumns];
  return COLUMN_CLASSES[2];
}

export function KpiStripe({ tiles, columns, className }: KpiStripeProps): React.JSX.Element {
  return (
    <div className={cn('grid grid-cols-1 gap-3', pickColumnClass(tiles.length, columns), className)}>
      {tiles.map((tile, index) => (
        <MetricTile key={tile.id ?? `${tile.label}-${index}`} {...tile} />
      ))}
    </div>
  );
}

KpiStripe.displayName = 'KpiStripe';
