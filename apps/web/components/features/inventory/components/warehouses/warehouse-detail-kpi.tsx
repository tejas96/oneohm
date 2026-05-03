'use client';

import * as React from 'react';

import { useFmt } from '../dashboard/use-fmt';
import { useStockAggregates } from '../stock/use-stock-aggregates';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import {
  useInventoryStockList,
  useStockSummaryByWarehouse,
} from '@/lib/hooks/resources/inventory-stock';

/**
 * KPI tile row for the warehouse detail page. Aggregates come from two
 * places to balance correctness and round-trip cost:
 *
 *   - `useStockSummaryByWarehouse()`: org-wide table grouped by
 *     warehouse. Source for SKU rows + inventory value at this
 *     warehouse. We grab the row for the current warehouseId.
 *   - `useInventoryStockList({ warehouseId })`: a one-page sample of
 *     stock for THIS warehouse. Used for the page-scoped low-stock
 *     count and total available units (matches the stock list
 *     numbers the operator sees when they click "Stock" tab).
 *
 * Why both: the by-warehouse endpoint doesn't expose a
 * low-stock count per warehouse (yet — that's a backend follow-up),
 * so we derive it client-side from the stock rows. We cap the page
 * size at 100 which covers the vast majority of warehouses without
 * a custom endpoint.
 */

export interface WarehouseDetailKpiProps {
  warehouseId: string;
}

export function WarehouseDetailKpi({ warehouseId }: WarehouseDetailKpiProps): React.JSX.Element {
  const fmt = useFmt();

  const summary = useStockSummaryByWarehouse();
  const summaryRow = summary.data?.find((s) => s.warehouseId === warehouseId);

  const stock = useInventoryStockList({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { warehouseId } as Record<string, unknown>,
  });

  const agg = useStockAggregates(stock.items);
  const isLoading = summary.isLoading || stock.isLoading;

  return (
    <KpiStripe
      tiles={[
        {
          id: 'wh-skus',
          label: 'SKU rows',
          value: fmt.number(summaryRow?.totalItems ?? agg.skuCount),
          secondary: 'distinct products stored',
          isLoading,
        },
        {
          id: 'wh-available',
          label: 'Available units',
          value: fmt.number(agg.totalAvailable),
          secondary: 'sum across SKUs',
          isLoading,
        },
        {
          id: 'wh-low',
          label: 'Low stock',
          value: fmt.number(agg.lowStockCount),
          intent: agg.lowStockCount > 0 ? 'warning' : 'neutral',
          secondary: 'available ≤ minimum',
          isLoading,
        },
        {
          id: 'wh-value',
          label: 'Inventory value',
          value: fmt.currency(summaryRow?.totalValue ?? 0),
          secondary: 'available × unit cost',
          isLoading,
        },
      ]}
    />
  );
}
