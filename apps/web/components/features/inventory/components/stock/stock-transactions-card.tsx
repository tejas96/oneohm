'use client';

import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import Link from 'next/link';
import * as React from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { ROUTES } from '@/lib/config/routes';
import {
  useInventoryTransactions,
  type InventoryTransaction,
} from '@/lib/hooks/resources/inventory-transactions';

/**
 * Recent stock transactions for the current product+warehouse pair.
 * Lives on the detail page below the quantity tiles.
 *
 * Why we filter by both productId AND warehouseId rather than just
 * showing all transactions for the product: the list page is per-row
 * (one product per warehouse) and an operator on this detail page is
 * almost always investigating "why did THIS row go up/down". Showing
 * cross-warehouse noise dilutes the signal. The "View all" link drops
 * them into the full transactions page with productId pre-applied so
 * they can broaden the view in one click.
 */

const MAX_ROWS = 8;
const TYPE_LABEL: Record<string, string> = {
  purchase: 'Purchase',
  allocation: 'Allocation',
  dispatch: 'Dispatch',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  adjustment: 'Adjustment',
  return: 'Return',
};

const POSITIVE_TYPES = new Set(['purchase', 'transfer_in', 'return']);

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function referenceLabel(t: InventoryTransaction): string | null {
  if (!t.referenceType || !t.referenceId) return null;
  return `${t.referenceType.replace(/_/g, ' ')} · ${t.referenceId.slice(0, 8)}`;
}

export interface StockTransactionsCardProps {
  productId: string;
  warehouseId: string;
  unit?: string;
}

export function StockTransactionsCard({
  productId,
  warehouseId,
  unit,
}: StockTransactionsCardProps): React.JSX.Element {
  const fmt = useFmt();
  const query = useInventoryTransactions({
    syncToUrl: false,
    defaultPageSize: MAX_ROWS,
    defaultFilters: { productId, warehouseId },
  });

  const items = query.items ?? [];

  const viewAllHref =
    `${ROUTES.INVENTORY.TRANSACTIONS}?productId=${encodeURIComponent(productId)}` +
    `&warehouseId=${encodeURIComponent(warehouseId)}`;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-light bg-white p-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent transactions</h3>
          <p className="text-xs text-foreground-tertiary">
            Last {MAX_ROWS} movements for this product at this warehouse
          </p>
        </div>
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all <LaunchRoundedIcon sx={{ fontSize: 12 }} />
        </Link>
      </header>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground-tertiary">
          No transactions recorded yet.
        </p>
      ) : (
        <ul className="divide-y divide-border-light">
          {items.map((t) => {
            const positive = POSITIVE_TYPES.has(t.transactionType) || t.transactionType === 'adjustment' && Number(t.quantity) > 0;
            const sign = positive ? '+' : '−';
            return (
              <li key={t.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span>{TYPE_LABEL[t.transactionType] ?? t.transactionType}</span>
                    {referenceLabel(t) && (
                      <span className="text-xs font-normal text-foreground-tertiary">
                        · {referenceLabel(t)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-foreground-tertiary">
                    {formatDate(t.transactionDate || t.createdAt)}
                    {t.creator?.name ? ` · ${t.creator.name}` : ''}
                  </div>
                  {t.notes ? (
                    <div className="mt-0.5 line-clamp-2 text-xs text-foreground-secondary">
                      {t.notes}
                    </div>
                  ) : null}
                </div>
                <div
                  className={
                    'shrink-0 text-sm font-medium tabular-nums ' +
                    (positive ? 'text-success' : 'text-warning')
                  }
                >
                  {sign}
                  {fmt.number(Math.abs(Number(t.quantity)))}
                  {unit ? ` ${unit}` : ''}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

StockTransactionsCard.displayName = 'StockTransactionsCard';
