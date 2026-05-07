'use client';

import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAID_BY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from '@oneohm-epc/shared/constants';
import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { REIMBURSEMENT_STATUS_COLOR } from '../constants';
import { AmountCell } from '../shared';

import { MUIStatusChip, MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrgExpenseListItem } from '@/lib/hooks/resources';

/**
 * Read-only org-wide Expenses ledger table.
 *
 * Shape mirrors {@link OrgReceiptsTable} for visual consistency
 * across ledger pages. Adds a Project column (joined by the backend
 * DTO) so the user sees which project each expense was booked to
 * without an extra click. Reimbursement status uses a dedicated chip
 * because it's the column most often filtered on.
 *
 * Mutations stay on the per-project Finance tab in V1; row click is
 * forwarded to `onRowClick` so slice 9 can wire ProjectFinanceDrawer.
 */
export interface OrgExpensesTableProps {
  items: OrgExpenseListItem[];
  isLoading?: boolean;
  onRowClick?: (item: OrgExpenseListItem) => void;
}

const SKELETON_ROWS = 8;

export function OrgExpensesTable({
  items,
  isLoading,
  onRowClick,
}: OrgExpensesTableProps): React.JSX.Element {
  return (
    <div className="border-border-light bg-surface w-full overflow-x-auto rounded-md border">
      <table className="w-full text-left">
        <thead className="bg-background-secondary border-border-light border-b">
          <tr className="text-foreground-tertiary text-2xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Expense #</th>
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 font-medium">Vendor</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Paid By</th>
            <th className="px-3 py-2 font-medium">Reimbursement</th>
          </tr>
        </thead>
        <tbody className="divide-border-light divide-y">
          {isLoading &&
            Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
              <tr key={`skel-${idx}`}>
                {Array.from({ length: 8 }).map((__, c) => (
                  <td key={c} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && items.length === 0 && (
            <tr>
              <td colSpan={8} className="text-foreground-tertiary px-3 py-8 text-center text-sm">
                No expenses match the current filters.
              </td>
            </tr>
          )}

          {!isLoading &&
            items.map((e) => {
              const interactive = Boolean(onRowClick);
              return (
                <tr
                  key={e.id}
                  onClick={interactive ? () => onRowClick?.(e) : undefined}
                  className={
                    interactive
                      ? 'hover:bg-surface-secondary cursor-pointer transition-colors'
                      : undefined
                  }
                >
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">
                      {formatDate(e.expenseDate, 'medium')}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="font-mono">
                      {e.expenseNumber}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <MUITypography variant="bodyPrimary" className="font-mono text-xs">
                        {e.projectNumber}
                      </MUITypography>
                      <MUITypography
                        variant="body"
                        className="text-foreground-secondary truncate text-xs"
                      >
                        {e.projectName}
                      </MUITypography>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="truncate">
                      {e.vendorName ?? '—'}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">
                      {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={e.amount} />
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">
                      {EXPENSE_PAID_BY_LABELS[e.paidBy] ?? e.paidBy}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUIStatusChip
                      label={
                        REIMBURSEMENT_STATUS_LABELS[e.reimbursementStatus] ?? e.reimbursementStatus
                      }
                      color={REIMBURSEMENT_STATUS_COLOR[e.reimbursementStatus] ?? 'default'}
                      colorSeed={e.reimbursementStatus}
                    />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
