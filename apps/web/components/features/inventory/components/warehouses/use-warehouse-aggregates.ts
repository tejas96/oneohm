'use client';

import { useMemo } from 'react';

import type { StockSummaryByWarehouseRow } from '@/lib/hooks/resources/inventory-stock';
import type { Warehouse } from '@/lib/hooks/resources/warehouses';

/**
 * Page-scoped warehouse aggregates derived from the visible list and
 * the org-wide `/inventory-stock/stats/by-warehouse` endpoint.
 *
 * Why two inputs:
 *   - The list of warehouses on the page already has the status/type
 *     fields we need for the "active" / "own" splits.
 *   - Stock counts live on a separate endpoint, so we join them in
 *     the hook rather than baking the query into every consumer.
 *
 * `byWarehouseStock` is keyed by warehouseId for O(1) lookups.
 */

export interface WarehouseAggregates {
  totalCount: number;
  activeCount: number;
  ownCount: number;
  partnerCount: number;
  totalSkuRows: number;
  totalValue: number;
  byWarehouseStock: Map<string, StockSummaryByWarehouseRow>;
}

const ZERO: WarehouseAggregates = {
  totalCount: 0,
  activeCount: 0,
  ownCount: 0,
  partnerCount: 0,
  totalSkuRows: 0,
  totalValue: 0,
  byWarehouseStock: new Map(),
};

export function useWarehouseAggregates(
  warehouses: readonly Warehouse[] | undefined,
  stockByWarehouse: readonly StockSummaryByWarehouseRow[] | undefined,
): WarehouseAggregates {
  return useMemo(() => {
    if (!warehouses || warehouses.length === 0) return ZERO;

    let activeCount = 0;
    let ownCount = 0;
    let partnerCount = 0;
    for (const w of warehouses) {
      if (w.status === 'active') activeCount += 1;
      if (w.warehouseType === 'own') ownCount += 1;
      else if (w.warehouseType === 'third_party') partnerCount += 1;
    }

    const byWarehouseStock = new Map<string, StockSummaryByWarehouseRow>();
    let totalSkuRows = 0;
    let totalValue = 0;
    if (stockByWarehouse && stockByWarehouse.length > 0) {
      for (const s of stockByWarehouse) {
        byWarehouseStock.set(s.warehouseId, s);
      }
      // Only count stock for warehouses currently on the page so the
      // KPI matches what the operator sees.
      for (const w of warehouses) {
        const s = byWarehouseStock.get(w.id);
        if (!s) continue;
        totalSkuRows += Number(s.totalItems ?? 0);
        totalValue += Number(s.totalValue ?? 0);
      }
    }

    return {
      totalCount: warehouses.length,
      activeCount,
      ownCount,
      partnerCount,
      totalSkuRows,
      totalValue,
      byWarehouseStock,
    };
  }, [warehouses, stockByWarehouse]);
}
