'use client';

import * as React from 'react';

import { useWarehouseAggregates } from './use-warehouse-aggregates';
import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import type { StockSummaryByWarehouseRow } from '@/lib/hooks/resources/inventory-stock';
import type { Warehouse } from '@/lib/hooks/resources/warehouses';

export interface WarehouseKpiStripProps {
  warehouses: readonly Warehouse[] | undefined;
  stockByWarehouse: readonly StockSummaryByWarehouseRow[] | undefined;
  totalRows: number;
  isLoading?: boolean;
}

export function WarehouseKpiStrip({
  warehouses,
  stockByWarehouse,
  totalRows,
  isLoading,
}: WarehouseKpiStripProps): React.JSX.Element {
  const fmt = useFmt();
  const agg = useWarehouseAggregates(warehouses, stockByWarehouse);
  const showingAll = totalRows === agg.totalCount;

  return (
    <KpiStripe
      tiles={[
        {
          id: 'wh-count',
          label: 'Warehouses on page',
          value: fmt.number(agg.totalCount),
          secondary: showingAll
            ? `${fmt.number(totalRows)} total`
            : `of ${fmt.number(totalRows)} total`,
          isLoading,
        },
        {
          id: 'wh-active',
          label: 'Active',
          value: fmt.number(agg.activeCount),
          secondary: agg.totalCount
            ? `${Math.round((agg.activeCount / agg.totalCount) * 100)}% of page`
            : '—',
          isLoading,
        },
        {
          id: 'wh-skus',
          label: 'SKU rows',
          value: fmt.number(agg.totalSkuRows),
          secondary: 'across visible warehouses',
          isLoading,
        },
        {
          id: 'wh-value',
          label: 'Inventory value',
          value: fmt.currency(agg.totalValue),
          secondary: 'sum across visible warehouses',
          isLoading,
        },
      ]}
    />
  );
}

WarehouseKpiStrip.displayName = 'WarehouseKpiStrip';
