'use client';

import { useMemo } from 'react';

import type { InventoryStock } from '@/lib/hooks/resources/inventory-stock';

/**
 * Derive list-level KPIs from the currently visible page of stock
 * rows. We deliberately do NOT call a separate `/inventory-stock/stats`
 * endpoint here for two reasons:
 *
 *   1. There isn't one yet — Part 10 added stats endpoints for POs,
 *      allocations, dispatches, and transactions but stock aggregates
 *      are tracked per-row and the dashboard already covers org-wide
 *      totals via `/inventory/stats`.
 *   2. Page-scoped KPIs reflect what the operator is actually looking
 *      at after applying filters (e.g. "5 low-stock items in
 *      Bangalore warehouse" when the warehouse filter is active),
 *      which is more useful in the list context than org totals.
 *
 * Aggregates returned:
 *   - skuCount         : distinct rows on the current page.
 *   - lowStockCount    : rows whose available <= minimum (and minimum > 0).
 *   - totalAvailable   : sum of available across rows (units).
 *   - totalReserved    : sum of reserved across rows.
 *   - totalInTransit   : sum of in-transit across rows.
 */

export interface StockAggregates {
  skuCount: number;
  lowStockCount: number;
  totalAvailable: number;
  totalReserved: number;
  totalInTransit: number;
}

const ZERO: StockAggregates = {
  skuCount: 0,
  lowStockCount: 0,
  totalAvailable: 0,
  totalReserved: 0,
  totalInTransit: 0,
};

export function useStockAggregates(rows: readonly InventoryStock[] | undefined): StockAggregates {
  return useMemo(() => {
    if (!rows || rows.length === 0) return ZERO;
    let lowStockCount = 0;
    let totalAvailable = 0;
    let totalReserved = 0;
    let totalInTransit = 0;
    for (const r of rows) {
      const avail = Number(r.availableQuantity ?? 0);
      const reserved = Number(r.reservedQuantity ?? 0);
      const inTransit = Number(r.inTransitQuantity ?? 0);
      const min = Number(r.minimumStockLevel ?? 0);
      if (Number.isFinite(avail)) totalAvailable += avail;
      if (Number.isFinite(reserved)) totalReserved += reserved;
      if (Number.isFinite(inTransit)) totalInTransit += inTransit;
      if (min > 0 && avail <= min) lowStockCount += 1;
    }
    return {
      skuCount: rows.length,
      lowStockCount,
      totalAvailable,
      totalReserved,
      totalInTransit,
    };
  }, [rows]);
}
