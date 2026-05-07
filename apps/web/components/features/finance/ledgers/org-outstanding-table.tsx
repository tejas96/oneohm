'use client';

import { PAYMENT_TERM_STATUS_LABELS } from '@oneohm-epc/shared/constants';
import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { PAYMENT_TERM_STATUS_COLOR } from '../constants';
import { AgingBucketChip, AmountCell } from '../shared';

import { MUIStatusChip, MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { OutstandingTerm } from '@/lib/hooks/resources';

/**
 * Outstanding payment terms ledger.
 *
 * One row per unpaid term (paid_amount < expected_amount AND status
 * not in waived/cancelled — backend filters these out). Surfaces the
 * three numbers users almost always want side-by-side (expected,
 * paid, outstanding) plus the aging bucket as a colored chip and the
 * raw days-overdue count for sortability.
 *
 * Negative `daysOverdue` means "due in N days" — we render that as
 * "+N d" with a muted grey to distinguish from the urgent red cohort.
 */
export interface OrgOutstandingTableProps {
  items: OutstandingTerm[];
  isLoading?: boolean;
  onRowClick?: (item: OutstandingTerm) => void;
}

const SKELETON_ROWS = 8;

function formatDaysOverdue(days: number | null): React.ReactNode {
  if (days === null) {
    return <span className="text-foreground-tertiary">—</span>;
  }
  if (days > 0) {
    return <span className="text-error font-medium">{days} d overdue</span>;
  }
  if (days === 0) {
    return <span className="text-warning font-medium">Due today</span>;
  }
  return <span className="text-foreground-tertiary">in {Math.abs(days)} d</span>;
}

export function OrgOutstandingTable({
  items,
  isLoading,
  onRowClick,
}: OrgOutstandingTableProps): React.JSX.Element {
  return (
    <div className="border-border-light bg-surface w-full overflow-x-auto rounded-md border">
      <table className="w-full text-left">
        <thead className="bg-background-secondary border-border-light border-b">
          <tr className="text-foreground-tertiary text-2xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Term</th>
            <th className="px-3 py-2 font-medium">Due</th>
            <th className="px-3 py-2 text-right font-medium">Expected</th>
            <th className="px-3 py-2 text-right font-medium">Paid</th>
            <th className="px-3 py-2 text-right font-medium">Outstanding</th>
            <th className="px-3 py-2 font-medium">Aging</th>
            <th className="px-3 py-2 font-medium">Status</th>
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
                Nothing outstanding — every term is fully paid or waived.
              </td>
            </tr>
          )}

          {!isLoading &&
            items.map((t) => {
              const interactive = Boolean(onRowClick);
              return (
                <tr
                  key={t.id}
                  onClick={interactive ? () => onRowClick?.(t) : undefined}
                  className={
                    interactive
                      ? 'hover:bg-surface-secondary cursor-pointer transition-colors'
                      : undefined
                  }
                >
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <MUITypography variant="bodyPrimary" className="font-mono text-xs">
                        {t.projectNumber}
                      </MUITypography>
                      <MUITypography
                        variant="body"
                        className="text-foreground-secondary truncate text-xs"
                      >
                        {t.projectName}
                      </MUITypography>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="truncate">
                      {t.customerName}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <MUITypography variant="bodyPrimary" className="text-xs">
                        {t.name}
                      </MUITypography>
                      <MUITypography variant="body" className="text-foreground-tertiary text-xs">
                        {t.stage}
                      </MUITypography>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <MUITypography variant="body">
                        {t.dueDate ? formatDate(t.dueDate, 'medium') : '—'}
                      </MUITypography>
                      <MUITypography variant="finePrint">
                        {formatDaysOverdue(t.daysOverdue)}
                      </MUITypography>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={t.expectedAmount} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={t.paidAmount} muted />
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={t.outstandingAmount} />
                  </td>
                  <td className="px-3 py-2.5">
                    <AgingBucketChip bucket={t.agingBucket} />
                  </td>
                  <td className="px-3 py-2.5">
                    <MUIStatusChip
                      label={PAYMENT_TERM_STATUS_LABELS[t.status] ?? t.status}
                      color={PAYMENT_TERM_STATUS_COLOR[t.status] ?? 'default'}
                      colorSeed={t.status}
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
