import { Injectable } from '@nestjs/common';
import { type InventoryTransactionType } from '@oneohm-epc/shared/types';

import {
  type FunnelResponse,
  type TopItemsResponse,
  type TrendPoint,
  type TrendResponse,
} from '../dto/common';
import { InventoryStockStatsRepository } from '../repositories/inventory-stock-stats.repository';
import { InventoryTransactionStatsRepository } from '../repositories/inventory-transaction-stats.repository';
import { MaterialDispatchStatsRepository } from '../repositories/material-dispatch-stats.repository';
import { StockAllocationStatsRepository } from '../repositories/stock-allocation-stats.repository';
import { resolveStatsBucket, resolveStatsLimit, resolveStatsWindow } from './helpers/stats-window';

/**
 * Aggregate stats service covering the four resources that have a
 * single stats endpoint each (transactions trend, allocation funnel,
 * dispatch funnel, top low-stock). PO has its own service because it
 * has 4 endpoints and would otherwise dominate this file.
 */
@Injectable()
export class InventoryStatsService {
  constructor(
    private readonly txnStats: InventoryTransactionStatsRepository,
    private readonly allocStats: StockAllocationStatsRepository,
    private readonly dispatchStats: MaterialDispatchStatsRepository,
    private readonly stockStats: InventoryStockStatsRepository,
  ) {}

  // ==================== Transactions ====================

  async transactionsByTypeTrend(
    organizationId: string,
    fromDate: string | undefined,
    toDate: string | undefined,
    bucket: string | undefined,
  ): Promise<TrendResponse> {
    const window = resolveStatsWindow(fromDate, toDate);
    const resolvedBucket = resolveStatsBucket(bucket);
    const rows = await this.txnStats.byTypeTrend(
      organizationId,
      window.fromDate,
      window.toDate,
      resolvedBucket,
    );
    return {
      fromDate: window.fromDate,
      toDate: window.toDate,
      bucket: resolvedBucket,
      points: groupByDate(rows),
    };
  }

  // ==================== Allocations ====================

  async allocationFunnel(
    organizationId: string,
    fromDate: string | undefined,
    toDate: string | undefined,
  ): Promise<FunnelResponse> {
    const window = resolveStatsWindow(fromDate, toDate);
    const result = await this.allocStats.funnel(organizationId, window.fromDate, window.toDate);
    return { fromDate: window.fromDate, toDate: window.toDate, ...result };
  }

  // ==================== Dispatches ====================

  async dispatchFunnel(
    organizationId: string,
    fromDate: string | undefined,
    toDate: string | undefined,
  ): Promise<FunnelResponse> {
    const window = resolveStatsWindow(fromDate, toDate);
    const result = await this.dispatchStats.funnel(organizationId, window.fromDate, window.toDate);
    return { fromDate: window.fromDate, toDate: window.toDate, ...result };
  }

  // ==================== Stock ====================

  async topLowStock(organizationId: string, limit: string | undefined): Promise<TopItemsResponse> {
    const resolvedLimit = resolveStatsLimit(limit);
    const rows = await this.stockStats.topLowStock(organizationId, resolvedLimit);
    return {
      limit: resolvedLimit,
      items: rows.map((r) => ({
        id: r.id,
        name: r.productCode ? `${r.productName} (${r.productCode})` : r.productName,
        value: r.deficit,
        meta: {
          availableQuantity: r.availableQuantity,
          minimumStockLevel: r.minimumStockLevel,
          warehouse: r.warehouseName,
        },
      })),
    };
  }
}

/**
 * Collapse the (date, transactionType, count) rows from the
 * by-type-trend repo query into one TrendPoint per bucket date with a
 * `series` map from transaction type to count, and a `total` summed
 * across all types. The repo orders rows by date ASC so we just walk
 * sequentially.
 */
function groupByDate(
  rows: Array<{ date: string; transactionType: InventoryTransactionType; count: number }>,
): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const row of rows) {
    let entry = map.get(row.date);
    if (!entry) {
      entry = { date: row.date, total: 0, series: {} };
      map.set(row.date, entry);
    }
    entry.total += row.count;
    if (entry.series) entry.series[row.transactionType] = row.count;
  }
  return Array.from(map.values());
}
