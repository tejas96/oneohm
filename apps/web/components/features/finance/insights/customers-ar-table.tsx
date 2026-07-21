'use client';

import { formatDate } from '@tejas96/shared/utils';
import * as React from 'react';

import { AmountCell } from '../shared';

import { MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { CustomerAging } from '@/lib/hooks/resources';

/**
 * Customers AR table — one row per customer, columns are the aging
 * buckets. Bucket cells use {@link AmountCell} with `muted` so the
 * eye is drawn to the Total Outstanding column on the left, and any
 * non-zero amount in 31-60/61-90/90+ jumps out via the cell tone
 * (handled by the parent's bucket-color CSS class on the column
 * header — kept simple here so the table stays scannable).
 *
 * Footer renders a sum row over the currently-displayed rows so users
 * can sanity-check the totals after a search filter. Sums are derived
 * from the visible rows only (intentional — matches what the user
 * sees on screen rather than a hidden full-population total).
 */
export interface CustomersArTableProps {
  items: CustomerAging[];
  isLoading?: boolean;
  onRowClick?: (item: CustomerAging) => void;
}

const SKELETON_ROWS = 8;

interface BucketTotals {
  total: number;
  current: number;
  b0: number;
  b30: number;
  b60: number;
  b90: number;
}

function computeTotals(items: CustomerAging[]): BucketTotals {
  return items.reduce<BucketTotals>(
    (acc, c) => ({
      total: acc.total + c.totalOutstanding,
      current: acc.current + c.current,
      b0: acc.b0 + c.bucket0to30,
      b30: acc.b30 + c.bucket31to60,
      b60: acc.b60 + c.bucket61to90,
      b90: acc.b90 + c.bucket90plus,
    }),
    { total: 0, current: 0, b0: 0, b30: 0, b60: 0, b90: 0 },
  );
}

export function CustomersArTable({
  items,
  isLoading,
  onRowClick,
}: CustomersArTableProps): React.JSX.Element {
  const totals = React.useMemo(() => computeTotals(items), [items]);

  return (
    <div className="bg-surface w-full overflow-x-auto rounded-xl shadow-e2">
      <table className="w-full text-left">
        <thead className="bg-background-secondary-b">
          <tr className="text-foreground-tertiary text-2xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 text-right font-medium">Total Outstanding</th>
            <th className="px-3 py-2 text-right font-medium">Current</th>
            <th className="px-3 py-2 text-right font-medium">0-30 d</th>
            <th className="px-3 py-2 text-right font-medium">31-60 d</th>
            <th className="px-3 py-2 text-right font-medium">61-90 d</th>
            <th className="px-3 py-2 text-right font-medium">90+ d</th>
            <th className="px-3 py-2 font-medium">Last Receipt</th>
            <th className="px-3 py-2 text-right font-medium">Open Terms</th>
          </tr>
        </thead>
        <tbody className="divide-border-light divide-y">
          {isLoading &&
            Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
              <tr key={`skel-${idx}`}>
                {Array.from({ length: 9 }).map((__, c) => (
                  <td key={c} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && items.length === 0 && (
            <tr>
              <td colSpan={9} className="text-foreground-tertiary px-3 py-8 text-center text-sm">
                No customers with outstanding receivables.
              </td>
            </tr>
          )}

          {!isLoading &&
            items.map((c) => {
              const interactive = Boolean(onRowClick);
              return (
                <tr
                  key={c.customerId}
                  onClick={interactive ? () => onRowClick?.(c) : undefined}
                  className={
                    interactive
                      ? 'hover:bg-surface-secondary cursor-pointer transition-colors'
                      : undefined
                  }
                >
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <MUITypography variant="bodyPrimary" className="truncate">
                        {c.customerName}
                      </MUITypography>
                      {c.customerPhone && (
                        <MUITypography variant="finePrint" className="text-foreground-tertiary">
                          {c.customerPhone}
                        </MUITypography>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={c.totalOutstanding} />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={c.current} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={c.bucket0to30} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={c.bucket31to60} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={c.bucket61to90} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={c.bucket90plus} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">
                      {c.lastReceiptDate ? formatDate(c.lastReceiptDate, 'medium') : '—'}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <MUITypography variant="body" className="tabular-nums">
                      {c.openTermCount}
                    </MUITypography>
                  </td>
                </tr>
              );
            })}
        </tbody>
        {!isLoading && items.length > 0 && (
          <tfoot className="bg-background-secondary-t">
            <tr>
              <td className="px-3 py-2.5">
                <MUITypography variant="bodyPrimary">Total ({items.length})</MUITypography>
              </td>
              <td className="px-3 py-2.5">
                <AmountCell value={totals.total} />
              </td>
              <td className="px-3 py-2.5">
                <AmountCell value={totals.current} muted />
              </td>
              <td className="px-3 py-2.5">
                <AmountCell value={totals.b0} muted />
              </td>
              <td className="px-3 py-2.5">
                <AmountCell value={totals.b30} muted />
              </td>
              <td className="px-3 py-2.5">
                <AmountCell value={totals.b60} muted />
              </td>
              <td className="px-3 py-2.5">
                <AmountCell value={totals.b90} muted />
              </td>
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
