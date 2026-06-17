import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MaterialDispatchStatus } from '@tejas96/shared/types';
import { Repository } from 'typeorm';

import { MaterialDispatchEntity } from '../entities/material-dispatch.entity';

/**
 * Read-only aggregation for the dispatch funnel chart. Lives in its
 * own repo to keep material-dispatch.repository.ts focused on CRUD.
 *
 * Note: material_dispatches has NO deletedAt column; soft-delete
 * filtering is intentionally absent — this matches every other
 * aggregation already in material-dispatch.repository.ts.
 */
@Injectable()
export class MaterialDispatchStatsRepository {
  constructor(
    @InjectRepository(MaterialDispatchEntity)
    private readonly repository: Repository<MaterialDispatchEntity>,
  ) {}

  /**
   * Dispatch funnel for a date window. Returns counts in the natural
   * lifecycle order so the FE can render directly without re-sorting.
   * CANCELLED is returned separately via cancelledCount.
   */
  async funnel(
    organizationId: string,
    fromDate: string,
    toDate: string,
  ): Promise<{ stages: Array<{ status: string; count: number }>; cancelledCount: number }> {
    const rows = await this.repository
      .createQueryBuilder('dispatch')
      .select('dispatch.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('dispatch.organizationId = :organizationId', { organizationId })
      .andWhere('dispatch.dispatch_date BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .groupBy('dispatch.status')
      .getRawMany<{ status: MaterialDispatchStatus; count: string }>();

    const counts = new Map<MaterialDispatchStatus, number>();
    for (const r of rows) counts.set(r.status, parseInt(r.count, 10));

    const order: MaterialDispatchStatus[] = [
      MaterialDispatchStatus.PREPARED,
      MaterialDispatchStatus.DISPATCHED,
      MaterialDispatchStatus.IN_TRANSIT,
      MaterialDispatchStatus.PARTIALLY_DELIVERED,
      MaterialDispatchStatus.DELIVERED,
    ];

    return {
      stages: order.map((s) => ({ status: s, count: counts.get(s) ?? 0 })),
      cancelledCount: counts.get(MaterialDispatchStatus.CANCELLED) ?? 0,
    };
  }
}
