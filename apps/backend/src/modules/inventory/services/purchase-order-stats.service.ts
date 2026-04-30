import { Injectable } from '@nestjs/common';

import { type TopItem, type TopItemsResponse, type TrendResponse } from '../dto/common';
import { PurchaseOrderStatsRepository } from '../repositories/purchase-order-stats.repository';
import {
  resolveStatsBucket,
  resolveStatsLimit,
  resolveStatsWindow,
} from './helpers/stats-window';

/**
 * Thin service wrapper around the PO stats repository. Resolves /
 * validates inputs, packages results into the shared response shapes
 * defined in dto/common/stats.dto.ts.
 */
@Injectable()
export class PurchaseOrderStatsService {
  constructor(private readonly repo: PurchaseOrderStatsRepository) {}

  async spendTrend(
    organizationId: string,
    fromDate: string | undefined,
    toDate: string | undefined,
    bucket: string | undefined,
  ): Promise<TrendResponse> {
    const window = resolveStatsWindow(fromDate, toDate);
    const resolvedBucket = resolveStatsBucket(bucket);
    const points = await this.repo.spendTrend(
      organizationId,
      window.fromDate,
      window.toDate,
      resolvedBucket,
    );
    return {
      fromDate: window.fromDate,
      toDate: window.toDate,
      bucket: resolvedBucket,
      points,
    };
  }

  async topVendors(
    organizationId: string,
    fromDate: string | undefined,
    toDate: string | undefined,
    limit: string | undefined,
  ): Promise<TopItemsResponse> {
    const window = resolveStatsWindow(fromDate, toDate);
    const resolvedLimit = resolveStatsLimit(limit);
    const rows = await this.repo.topVendors(
      organizationId,
      window.fromDate,
      window.toDate,
      resolvedLimit,
    );
    return {
      fromDate: window.fromDate,
      toDate: window.toDate,
      limit: resolvedLimit,
      items: rows.map<TopItem>((r) => ({
        id: r.id,
        name: r.name,
        value: r.value,
        meta: { orderCount: r.orderCount },
      })),
    };
  }

  async spendByWarehouse(
    organizationId: string,
    fromDate: string | undefined,
    toDate: string | undefined,
    limit: string | undefined,
  ): Promise<TopItemsResponse> {
    const window = resolveStatsWindow(fromDate, toDate);
    const resolvedLimit = resolveStatsLimit(limit);
    const rows = await this.repo.spendByWarehouse(
      organizationId,
      window.fromDate,
      window.toDate,
      resolvedLimit,
    );
    return {
      fromDate: window.fromDate,
      toDate: window.toDate,
      limit: resolvedLimit,
      items: rows.map<TopItem>((r) => ({
        id: r.id,
        name: r.name,
        value: r.value,
        meta: { orderCount: r.orderCount },
      })),
    };
  }

  async outstandingByVendor(
    organizationId: string,
    limit: string | undefined,
  ): Promise<TopItemsResponse> {
    const resolvedLimit = resolveStatsLimit(limit);
    const rows = await this.repo.outstandingByVendor(organizationId, resolvedLimit);
    return {
      limit: resolvedLimit,
      items: rows.map<TopItem>((r) => ({
        id: r.id,
        name: r.name,
        value: r.value,
        meta: { orderCount: r.orderCount },
      })),
    };
  }
}
