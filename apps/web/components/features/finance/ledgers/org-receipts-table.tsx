'use client';

import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { PAYMENT_STATUS_LABELS } from '../../projects/constants';
import { RECEIPT_STATUS_COLOR } from '../constants';
import { AmountCell } from '../shared';

import { MUIStatusChip, MUITypography } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrgReceiptListItem } from '@/lib/hooks/resources';

/**
 * Read-only org-wide Receipts ledger table.
 *
 * Reuses the project-tab receipts-table.tsx visual idiom (raw <table>
 * + tailwind, MUITypography in every cell, MUIStatusChip for status,
 * mono for IDs and amounts) but drops the per-row mutation menu —
 * org-level receipt mutations stay on the project page in V1 (see
 * plan §"Reuse of existing tables"). Adds Project + Customer columns
 * so the same row tells you "what got paid, by whom, against which
 * project" in one glance.
 *
 * Row click is forwarded to `onRowClick(item)` — the parent page wires
 * this to ProjectFinanceDrawer in slice 9. For V1 we call it eagerly
 * with the full item so the drawer can avoid an extra round-trip.
 */
export interface OrgReceiptsTableProps {
  items: OrgReceiptListItem[];
  isLoading?: boolean;
  onRowClick?: (item: OrgReceiptListItem) => void;
}

const SKELETON_ROWS = 8;

export function OrgReceiptsTable({
  items,
  isLoading,
  onRowClick,
}: OrgReceiptsTableProps): React.JSX.Element {
  return (
    <div className="border-border-light bg-surface w-full overflow-x-auto rounded-md border">
      <table className="w-full text-left">
        <thead className="bg-background-secondary border-border-light border-b">
          <tr className="text-foreground-tertiary text-2xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Receipt #</th>
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Method</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-border-light divide-y">
          {isLoading &&
            Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
              <tr key={`skel-${idx}`}>
                {Array.from({ length: 7 }).map((__, c) => (
                  <td key={c} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && items.length === 0 && (
            <tr>
              <td colSpan={7} className="text-foreground-tertiary px-3 py-8 text-center text-sm">
                No receipts match the current filters.
              </td>
            </tr>
          )}

          {!isLoading &&
            items.map((r) => {
              const interactive = Boolean(onRowClick);
              return (
                <tr
                  key={r.id}
                  onClick={interactive ? () => onRowClick?.(r) : undefined}
                  className={
                    interactive
                      ? 'hover:bg-surface-secondary cursor-pointer transition-colors'
                      : undefined
                  }
                >
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body">
                      {formatDate(r.createdAt, 'medium')}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="font-mono">
                      {r.paymentNumber}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <MUITypography variant="bodyPrimary" className="font-mono text-xs">
                        {r.projectNumber}
                      </MUITypography>
                      <MUITypography
                        variant="body"
                        className="text-foreground-secondary truncate text-xs"
                      >
                        {r.projectName}
                      </MUITypography>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="truncate">
                      {r.customerName}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <AmountCell value={r.paidAmount} />
                  </td>
                  <td className="px-3 py-2.5">
                    <MUITypography variant="body" className="capitalize">
                      {r.paymentMethod?.replace(/_/g, ' ') ?? '—'}
                    </MUITypography>
                  </td>
                  <td className="px-3 py-2.5">
                    <MUIStatusChip
                      label={PAYMENT_STATUS_LABELS[r.status] ?? r.status}
                      color={RECEIPT_STATUS_COLOR[r.status] ?? 'default'}
                      colorSeed={r.status}
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
