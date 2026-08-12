'use client';

import type { JSX } from 'react';

import { MUITypography } from './mui-typography';

import { formatSystemSize, hasSystemSizeVariance } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

export type SystemSizeDisplaySize = 'sm' | 'md' | 'lg';
export type SystemSizeDisplayLayout = 'inline' | 'stacked';

export interface SystemSizeDisplayProps {
  /** Actual (calculated) system size in kW — shown as the primary value */
  actualKw?: number;
  /** Requested (selected) system size in kW — shown as secondary when it differs from actual */
  requestedKw?: number;
  /**
   * Visual size of the primary value.
   * - 'sm' → MUITypography `timestamp` (12px muted) — for compact header/subtitle contexts
   * - 'md' → MUITypography `bodyPrimary` (14px, bold) — default, for list/card rows
   * - 'lg' → large 3xl numeric — for hero/specs card
   */
  size?: SystemSizeDisplaySize;
  /**
   * How the secondary "sel. X kW" label is laid out relative to primary.
   * - 'inline' → same line as muted suffix (list column, card, header)
   * - 'stacked' → second line below primary (specs hero card)
   * Ignored when size is 'lg' (always stacked).
   */
  layout?: SystemSizeDisplayLayout;
  /** Extra Tailwind classes on the root wrapper */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Displays system size with the actual (calculated) value as primary and
 * optionally shows the requested (selected) size when they differ.
 *
 * @example Compact list column (stacked secondary)
 * <SystemSizeDisplay actualKw={project.actualSystemSizeKw} requestedKw={project.systemSizeKw} layout="stacked" />
 *
 * @example Inline header segment
 * <SystemSizeDisplay actualKw={project.actualSystemSizeKw} requestedKw={project.systemSizeKw} size="sm" layout="inline" />
 *
 * @example Large hero card (overview-system-specs)
 * <SystemSizeDisplay actualKw={project.actualSystemSizeKw} requestedKw={project.systemSizeKw} size="lg" />
 */
export function SystemSizeDisplay({
  actualKw,
  requestedKw,
  size = 'md',
  layout = 'inline',
  className,
}: SystemSizeDisplayProps): JSX.Element {
  const primary = actualKw ?? requestedKw;
  const showSecondary = hasSystemSizeVariance(actualKw, requestedKw);
  const primaryStr = primary != null ? `${formatSystemSize(primary)} kW` : '—';
  /* "selected", not "sel." — the abbreviation saved four characters and cost
     the reader the meaning. Matches the wording used in the detail tables. */
  const secondaryStr = requestedKw != null ? `selected ${formatSystemSize(requestedKw)} kW` : '';

  // ── Large hero size (always stacked) ──────────────────────────────────
  if (size === 'lg') {
    return (
      <div className={className}>
        <p className="text-3xl leading-none font-semibold text-primary mt-1">
          {primary != null ? formatSystemSize(primary) : '—'}
          <span className="text-sm text-foreground-secondary ml-1">kW</span>
        </p>
        {showSecondary && (
          <p className="text-[11px] text-foreground-tertiary mt-0.5">{secondaryStr}</p>
        )}
      </div>
    );
  }

  // ── Stacked layout (secondary on second line) ──────────────────────────
  if (layout === 'stacked') {
    return (
      <div className={className}>
        <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500 }}>
          {primaryStr}
        </MUITypography>
        {showSecondary && <MUITypography variant="finePrint">{secondaryStr}</MUITypography>}
      </div>
    );
  }

  // ── Default: inline (secondary as muted suffix on same line) ──────────
  return (
    <span className={className}>
      <MUITypography
        component="span"
        variant={size === 'sm' ? 'timestamp' : 'bodyPrimary'}
        sx={size === 'md' ? { fontWeight: 500 } : undefined}
      >
        {primaryStr}
      </MUITypography>
      {showSecondary && (
        <MUITypography component="span" variant="finePrint" sx={{ ml: 0.5 }}>
          ({secondaryStr})
        </MUITypography>
      )}
    </span>
  );
}
