'use client';

import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import Link from 'next/link';
import { useMemo } from 'react';

import {
  InventoryActivityTimeline,
  type InventoryActivityEvent,
  type InventoryEventKind,
} from '@/components/shared/inventory';
import { ROUTES } from '@/lib/config/routes';
import {
  useInventoryTransactions,
  type InventoryTransaction,
} from '@/lib/hooks/resources/inventory-transactions';

/**
 * Activity rail for the inventory dashboard. Reads the most recent 20
 * `inventory_transactions` rows and adapts them to the
 * `InventoryActivityTimeline` shape (Part 11 primitive).
 *
 * Why transactions and not a unified events table: the backend doesn't
 * expose a cross-resource activity feed (PO approvals, allocations,
 * dispatches all live in their own tables). Transactions cover the
 * stock-level moves which are the most interesting "what just changed"
 * signal for a warehouse operator. PO/dispatch lifecycle events get
 * surfaced on their own detail pages where they have richer context.
 *
 * Per UX1 in the plan: every event must declare its `kind` explicitly
 * so the timeline can pick the right icon + colour. We map the
 * backend's `transactionType` enum (string) into our `InventoryEventKind`
 * via a small lookup that biases toward the dominant inventory verbs
 * (receive / adjust / transfer / deplete). Unknown types fall back to
 * 'updated' so the rail never crashes on a new enum value.
 */

const TYPE_TO_KIND: Record<string, InventoryEventKind> = {
  purchase: 'stock-receive',
  return: 'stock-receive',
  transfer_in: 'stock-transfer',
  transfer_out: 'stock-transfer',
  adjustment: 'stock-adjust',
  consumption: 'stock-deplete',
  dispatch: 'dispatched',
  damage: 'stock-deplete',
  loss: 'stock-deplete',
};

const TYPE_LABEL: Record<string, string> = {
  purchase: 'Purchase',
  return: 'Return',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  adjustment: 'Adjustment',
  consumption: 'Consumption',
  dispatch: 'Dispatch',
  damage: 'Damage',
  loss: 'Loss',
};

function adapt(tx: InventoryTransaction): InventoryActivityEvent {
  const kind = TYPE_TO_KIND[tx.transactionType] ?? 'updated';
  const label = TYPE_LABEL[tx.transactionType] ?? tx.transactionType;
  const productName = tx.product?.name ?? tx.productId;
  const warehouseName = tx.warehouse?.name ?? tx.warehouseId;
  const quantity = Math.abs(tx.quantity);
  return {
    id: tx.id,
    kind,
    timestamp: new Date(tx.transactionDate),
    title: `${label} · ${productName}`,
    description: `${quantity} units · ${warehouseName}`,
    actor: tx.creator?.name,
    badgeLabel: label,
    href: `${ROUTES.INVENTORY.TRANSACTIONS}?search=${encodeURIComponent(productName)}`,
  };
}

/**
 * Activity rail. Capped at 8 events on the dashboard so the section
 * doesn't outgrow the rest of the layout — operators who need the full
 * list can click "View all" to jump to /inventory/transactions. The
 * inner timeline is wrapped in a max-height scroll container so even
 * burst-y windows stay visually contained.
 */
const RAIL_LIMIT = 8;

interface DashboardActivityRailProps {
  className?: string;
}

export function DashboardActivityRail({
  className,
}: DashboardActivityRailProps = {}): React.JSX.Element {
  const { items, isLoading } = useInventoryTransactions({
    resource: 'dashboard-activity-rail',
    defaultPageSize: RAIL_LIMIT,
    syncToUrl: false,
    defaultSort: { field: 'transactionDate', order: 'DESC' },
  });

  const events = useMemo<ReadonlyArray<InventoryActivityEvent>>(
    () => items.slice(0, RAIL_LIMIT).map(adapt),
    [items],
  );

  return (
    <div
      className={`flex flex-col rounded-xl border border-border-light bg-surface${
        className ? ` ${className}` : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-light px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Recent activity</div>
          <div className="mt-0.5 text-xs text-foreground-tertiary">
            Last {RAIL_LIMIT} stock movements
          </div>
        </div>
        <Link
          href={ROUTES.INVENTORY.TRANSACTIONS}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <OpenInNewRoundedIcon sx={{ fontSize: 12 }} />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <InventoryActivityTimeline
          events={events}
          isLoading={isLoading}
          emptyMessage="No recent inventory activity"
        />
      </div>
    </div>
  );
}
