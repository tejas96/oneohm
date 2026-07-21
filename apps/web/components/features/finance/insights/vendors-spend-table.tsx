'use client';

import { EXPENSE_CATEGORY_LABELS } from '@tejas96/shared/constants';
import { type ExpenseCategory } from '@tejas96/shared/types';
import { formatDate } from '@tejas96/shared/utils';
import * as React from 'react';

import { AmountCell } from '../shared';

import { MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { VendorSpend } from '@/lib/hooks/resources';

/**
 * Vendor spend insights table — one row per case-insensitive vendor
 * name (the backend already groups via LOWER(TRIM(...)) since
 * project_expenses.vendor_name is free text — no FK to a vendor master
 * exists in V1, see the docs banner on the parent page).
 *
 * "% Reimbursed" surfaces as a small monospaced percentage and reads
 * "the share of this vendor's expenses that have been reimbursed".
 * Useful for spotting the long-tail of unreimbursed employee
 * out-of-pocket spend per vendor.
 */
export interface VendorsSpendTableProps {
  items: VendorSpend[];
  isLoading?: boolean;
  onRowClick?: (item: VendorSpend) => void;
}

const SKELETON_ROWS = 8;

function topCategoryLabel(raw: string): string {
  const cat = raw as ExpenseCategory;
  return (EXPENSE_CATEGORY_LABELS as Record<string, string>)[cat] ?? raw;
}

export function VendorsSpendTable({
  items,
  isLoading,
  onRowClick,
}: VendorsSpendTableProps): React.JSX.Element {
  return (
    <div className="bg-surface w-full overflow-x-auto rounded-xl shadow-e2">
      <table className="w-full text-left">
        <thead className="bg-background-secondary-b">
          <tr className="text-foreground-tertiary text-2xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Vendor</th>
            <th className="px-3 py-2 text-right font-medium">Total Spend</th>
            <th className="px-3 py-2 text-right font-medium">Expenses</th>
            <th className="px-3 py-2 font-medium">Last Expense</th>
            <th className="px-3 py-2 font-medium">Top Category</th>
            <th className="px-3 py-2 text-right font-medium">% Reimbursed</th>
          </tr>
        </thead>
        <tbody className="divide-border-light divide-y">
          {isLoading &&
            Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
              <tr key={`skel-${idx}`}>
                {Array.from({ length: 6 }).map((__, c) => (
                  <td key={c} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && items.length === 0 && (
            <tr>
              <td colSpan={6} className="text-foreground-tertiary px-3 py-8 text-center text-sm">
                No vendor spend in the selected range.
              </td>
            </tr>
          )}

          {!isLoading &&
            items.map((v) => {
              const interactive = Boolean(onRowClick);
              const pct = Math.round(v.reimbursedPercentage);
              return (
                <tr
                  key={v.vendorKey}
                  onClick={interactive ? () => onRowClick?.(v) : undefined}
                  className={
                    interactive
                      ? 'hover:bg-surface-secondary cursor-pointer transition-colors'
                      : undefined
                  }
                >
                  <td className="px-3 py-2.5">
                    <MUITypography variant="bodyPrimary" className="truncate">
                      {v.vendorName || '(unnamed vendor)'}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={v.totalSpend} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <MUITypography variant="body" className="tabular-nums">
                      {v.expenseCount}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">
                      {v.lastExpenseDate ? formatDate(v.lastExpenseDate, 'medium') : '—'}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">{topCategoryLabel(v.topCategory)}</MUITypography>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <MUITypography variant="body" className="tabular-nums">
                      {pct}%
                    </MUITypography>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
