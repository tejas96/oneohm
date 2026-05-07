'use client';

import * as React from 'react';

import { MUITypography } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

export interface AmountCellProps {
  /** Amount in INR. `null`/`undefined` renders an em-dash. */
  value: number | null | undefined;
  /** When true, paint negative values red and positive values green. */
  signed?: boolean;
  /** Render with thinner weight for secondary contexts (e.g. paid sub-amount). */
  muted?: boolean;
  className?: string;
}

/**
 * Right-aligned, monospaced INR amount cell. Lives at every "money"
 * intersection in the Finance ledgers so column alignment is consistent
 * across the ten new pages. Always uses `formatCurrency` (en-IN, INR).
 *
 * Usage: drop directly inside a `<td>` — no wrapper needed.
 */
export function AmountCell({
  value,
  signed = false,
  muted = false,
  className,
}: AmountCellProps): React.JSX.Element {
  if (value == null) {
    return (
      <MUITypography
        variant="body"
        className={className ?? 'text-foreground-tertiary text-right tabular-nums'}
      >
        —
      </MUITypography>
    );
  }

  const tone = !signed
    ? muted
      ? 'text-foreground-secondary'
      : 'text-foreground'
    : value < 0
      ? 'text-error'
      : value > 0
        ? 'text-success'
        : muted
          ? 'text-foreground-secondary'
          : 'text-foreground';

  return (
    <MUITypography
      variant={muted ? 'body' : 'bodyPrimary'}
      className={className ?? `${tone} text-right tabular-nums`}
    >
      {formatCurrency(value)}
    </MUITypography>
  );
}
