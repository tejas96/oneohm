'use client';

import type { JSX } from 'react';

import { MUITypography } from './mui-typography';

import { formatSystemSize } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

export type SystemSizeDisplaySize = 'sm' | 'md' | 'lg';
export type SystemSizeDisplayLayout = 'inline' | 'stacked';

export interface SystemSizeDisplayProps {
  /** Calculated system size in kW (from totalWattageWp) */
  kw?: number;
  /** @deprecated Use `kw` — kept for gradual migration */
  actualKw?: number;
  /**
   * Visual size of the primary value.
   * - 'sm' → MUITypography `timestamp` (12px muted) — for compact header/subtitle contexts
   * - 'md' → MUITypography `bodyPrimary` (14px, bold) — default, for list/card rows
   * - 'lg' → large 3xl numeric — for hero/specs card
   */
  size?: SystemSizeDisplaySize;
  /** Ignored when size is 'lg' (always stacked). */
  layout?: SystemSizeDisplayLayout;
  /** Extra Tailwind classes on the root wrapper */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Displays calculated system size in kW.
 */
export function SystemSizeDisplay({
  kw,
  actualKw,
  size = 'md',
  layout = 'inline',
  className,
}: SystemSizeDisplayProps): JSX.Element {
  const value = kw ?? actualKw;
  const displayStr = value != null ? `${formatSystemSize(value)} kW` : '—';

  if (size === 'lg') {
    return (
      <div className={className}>
        <p className="text-3xl leading-none font-semibold text-primary mt-1">
          {value != null ? formatSystemSize(value) : '—'}
          <span className="text-sm text-foreground-secondary ml-1">kW</span>
        </p>
      </div>
    );
  }

  if (layout === 'stacked') {
    return (
      <div className={className}>
        <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500 }}>
          {displayStr}
        </MUITypography>
      </div>
    );
  }

  return (
    <span className={className}>
      <MUITypography
        component="span"
        variant={size === 'sm' ? 'timestamp' : 'bodyPrimary'}
        sx={size === 'md' ? { fontWeight: 500 } : undefined}
      >
        {displayStr}
      </MUITypography>
    </span>
  );
}
