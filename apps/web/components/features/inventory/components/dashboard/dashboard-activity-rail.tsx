'use client';

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

export function DashboardActivityRail(): React.JSX.Element {
  const { items, isLoading } = useInventoryTransactions({
    resource: 'dashboard-activity-rail',
    defaultPageSize: 20,
    syncToUrl: false,
    defaultSort: { field: 'transactionDate', order: 'DESC' },
  });

  const events = useMemo<ReadonlyArray<InventoryActivityEvent>>(
    () => items.map(adapt),
    [items],
  );

  return (
    <InventoryActivityTimeline
      title="Recent activity"
      events={events}
      isLoading={isLoading}
      groupByDate
      emptyMessage="No recent inventory activity in the last 20 transactions"
    />
  );
}
