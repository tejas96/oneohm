'use client';

import * as React from 'react';

import { useFmt } from '../dashboard/use-fmt';
import { useStockAggregates } from './use-stock-aggregates';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import type { InventoryStock } from '@/lib/hooks/resources/inventory-stock';

/**
 * KPI stripe at the top of the stock list. Aggregates are derived from
 * the visible page (see `useStockAggregates` for why we do this client
 * side rather than calling a stats endpoint). The "?" tooltip surfaced
 * via `secondary` text makes it explicit that these reflect the
 * filtered view, not the org-wide totals shown on the dashboard.
 */

export interface StockKpiStripProps {
  rows: readonly InventoryStock[] | undefined;
  /** Total row count from the server — drives the "of N total" caption. */
  totalRows: number;
  isLoading?: boolean;
}

export function StockKpiStrip({ rows, totalRows, isLoading }: StockKpiStripProps): React.JSX.Element {
  const fmt = useFmt();
  const agg = useStockAggregates(rows);
  const showingAll = totalRows === agg.skuCount;

  return (
    <KpiStripe
      tiles={[
        {
          id: 'sku-count',
          label: 'SKU rows on page',
          value: fmt.number(agg.skuCount),
          secondary: showingAll
            ? `${fmt.number(totalRows)} total`
            : `of ${fmt.number(totalRows)} total`,
          isLoading,
        },
        {
          id: 'low-stock',
          label: 'Low stock (page)',
          value: fmt.number(agg.lowStockCount),
          intent: agg.lowStockCount > 0 ? 'warning' : 'neutral',
          secondary: 'available ≤ minimum',
          isLoading,
        },
        {
          id: 'available-units',
          label: 'Available units',
          value: fmt.number(agg.totalAvailable),
          secondary: 'sum across rows on page',
          isLoading,
        },
        {
          id: 'in-transit',
          label: 'In transit',
          value: fmt.number(agg.totalInTransit),
          secondary: 'units on the move',
          isLoading,
        },
      ]}
    />
  );
}

StockKpiStrip.displayName = 'StockKpiStrip';
