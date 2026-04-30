import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StockAllocationStatus } from '@oneohm-epc/shared/types';
import { Repository } from 'typeorm';

import { StockAllocationEntity } from '../entities/stock-allocation.entity';

/**
 * Read-only aggregation for the allocation funnel chart.
 *
 * Note: stock_allocations has NO deletedAt column (verified via the
 * entity definition + the soft-delete-removal fix in Part 4); soft-
 * delete filtering is intentionally absent.
 */
@Injectable()
export class StockAllocationStatsRepository {
  constructor(
    @InjectRepository(StockAllocationEntity)
    private readonly repository: Repository<StockAllocationEntity>,
  ) {}

  /**
   * Allocation funnel for a date window over allocatedAt. Returns
   * counts in the natural lifecycle order; CANCELLED is returned
   * separately via cancelledCount.
   */
  async funnel(
    organizationId: string,
    fromDate: string,
    toDate: string,
  ): Promise<{ stages: Array<{ status: string; count: number }>; cancelledCount: number }> {
    const rows = await this.repository
      .createQueryBuilder('alloc')
      .select('alloc.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('alloc.organizationId = :organizationId', { organizationId })
      .andWhere('alloc.allocated_at >= :fromDate', { fromDate })
      .andWhere("alloc.allocated_at < (CAST(:toDate AS date) + INTERVAL '1 day')", { toDate })
      .groupBy('alloc.status')
      .getRawMany<{ status: StockAllocationStatus; count: string }>();

    const counts = new Map<StockAllocationStatus, number>();
    for (const r of rows) counts.set(r.status, parseInt(r.count, 10));

    const order: StockAllocationStatus[] = [
      StockAllocationStatus.ALLOCATED,
      StockAllocationStatus.PARTIALLY_DISPATCHED,
      StockAllocationStatus.DISPATCHED,
      StockAllocationStatus.COMPLETED,
    ];

    return {
      stages: order.map((s) => ({ status: s, count: counts.get(s) ?? 0 })),
      cancelledCount: counts.get(StockAllocationStatus.CANCELLED) ?? 0,
    };
  }
}
