import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InventoryTransactionType } from '@tejas96/shared/types';
import { Repository } from 'typeorm';

import { InventoryTransactionEntity } from '../entities/inventory-transaction.entity';
import { bucketDateExpr, type StatsBucket } from '../services/helpers/stats-window';

/**
 * Read-only aggregations for transaction-type-trend chart.
 * inventory_transactions has no deletedAt — soft-delete filtering is
 * intentionally absent.
 */
@Injectable()
export class InventoryTransactionStatsRepository {
  constructor(
    @InjectRepository(InventoryTransactionEntity)
    private readonly repository: Repository<InventoryTransactionEntity>,
  ) {}

  /**
   * Transaction count grouped by date-bucket and transactionType. The
   * service composes these rows into the stacked-bar shape (one
   * entry per bucket with `series: { type: count }`).
   */
  async byTypeTrend(
    organizationId: string,
    fromDate: string,
    toDate: string,
    bucket: StatsBucket,
  ): Promise<Array<{ date: string; transactionType: InventoryTransactionType; count: number }>> {
    const dateExpr = bucketDateExpr('txn.transaction_date', bucket);
    const rows = await this.repository
      .createQueryBuilder('txn')
      .select(dateExpr, 'date')
      .addSelect('txn.transactionType', 'transactionType')
      .addSelect('COUNT(*)', 'count')
      .where('txn.organizationId = :organizationId', { organizationId })
      .andWhere('txn.transaction_date >= :fromDate', { fromDate })
      .andWhere("txn.transaction_date < (CAST(:toDate AS date) + INTERVAL '1 day')", { toDate })
      .groupBy(dateExpr)
      .addGroupBy('txn.transactionType')
      .orderBy(dateExpr, 'ASC')
      .getRawMany<{ date: string; transactionType: InventoryTransactionType; count: string }>();

    return rows.map((r) => ({
      date: r.date,
      transactionType: r.transactionType,
      count: parseInt(r.count, 10),
    }));
  }
}
