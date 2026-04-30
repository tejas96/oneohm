import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrderStatus } from '@oneohm-epc/shared/types';
import { Repository } from 'typeorm';

import { PurchaseOrderEntity } from '../entities/purchase-order.entity';
import {
  bucketDateExpr,
  type StatsBucket,
} from '../services/helpers/stats-window';

/**
 * Read-only aggregations for the PO dashboard charts. Lives in its own
 * repository because purchase-order.repository.ts is already near the
 * 500-line limit; keeping stats SQL here keeps the operational repo
 * focused on CRUD.
 *
 * Convention reminders that apply to every method below:
 *   * org-scoped on every query
 *   * soft-delete via `po.deletedAt IS NULL` (PO entity has @DeleteDateColumn)
 *   * CANCELLED orders are excluded from spend totals — that money never moved
 *   * NUMERICs come back as strings; we Number() them in JS so the
 *     response shape is plain JSON `number`s
 *   * COUNT(*) comes back as a string from pg too; parseInt all of them
 */
@Injectable()
export class PurchaseOrderStatsRepository {
  constructor(
    @InjectRepository(PurchaseOrderEntity)
    private readonly repository: Repository<PurchaseOrderEntity>,
  ) {}

  /**
   * PO total_amount summed per bucket of po_date.
   * CANCELLED excluded.
   */
  async spendTrend(
    organizationId: string,
    fromDate: string,
    toDate: string,
    bucket: StatsBucket,
  ): Promise<Array<{ date: string; total: number }>> {
    const dateExpr = bucketDateExpr('po.po_date', bucket);
    const rows = await this.repository
      .createQueryBuilder('po')
      .select(dateExpr, 'date')
      .addSelect('SUM(po.total_amount)', 'total')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.deletedAt IS NULL')
      .andWhere('po.po_date BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .andWhere('po.status != :cancelled', { cancelled: PurchaseOrderStatus.CANCELLED })
      .groupBy(dateExpr)
      .orderBy(dateExpr, 'ASC')
      .getRawMany<{ date: string; total: string | null }>();

    return rows.map((r) => ({ date: r.date, total: Number(r.total ?? 0) }));
  }

  /**
   * Top vendors by spend (sum of PO total_amount, CANCELLED excluded).
   */
  async topVendors(
    organizationId: string,
    fromDate: string,
    toDate: string,
    limit: number,
  ): Promise<Array<{ id: string; name: string; value: number; orderCount: number }>> {
    const rows = await this.repository
      .createQueryBuilder('po')
      .innerJoin('po.vendor', 'vendor')
      .select('vendor.id', 'id')
      .addSelect('vendor.name', 'name')
      .addSelect('SUM(po.total_amount)', 'value')
      .addSelect('COUNT(*)', 'orderCount')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.deletedAt IS NULL')
      .andWhere('po.po_date BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .andWhere('po.status != :cancelled', { cancelled: PurchaseOrderStatus.CANCELLED })
      .groupBy('vendor.id')
      .addGroupBy('vendor.name')
      .orderBy('SUM(po.total_amount)', 'DESC')
      .limit(limit)
      .getRawMany<{ id: string; name: string; value: string | null; orderCount: string }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value ?? 0),
      orderCount: parseInt(r.orderCount, 10),
    }));
  }

  /**
   * Spend grouped by warehouse (warehouse is nullable on POs; we
   * exclude rows with no warehouse so the chart is meaningful).
   */
  async spendByWarehouse(
    organizationId: string,
    fromDate: string,
    toDate: string,
    limit: number,
  ): Promise<Array<{ id: string; name: string; value: number; orderCount: number }>> {
    const rows = await this.repository
      .createQueryBuilder('po')
      .innerJoin('po.warehouse', 'warehouse')
      .select('warehouse.id', 'id')
      .addSelect('warehouse.name', 'name')
      .addSelect('SUM(po.total_amount)', 'value')
      .addSelect('COUNT(*)', 'orderCount')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.deletedAt IS NULL')
      .andWhere('po.po_date BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .andWhere('po.status != :cancelled', { cancelled: PurchaseOrderStatus.CANCELLED })
      .groupBy('warehouse.id')
      .addGroupBy('warehouse.name')
      .orderBy('SUM(po.total_amount)', 'DESC')
      .limit(limit)
      .getRawMany<{ id: string; name: string; value: string | null; orderCount: string }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value ?? 0),
      orderCount: parseInt(r.orderCount, 10),
    }));
  }

  /**
   * Outstanding balance (total - paid) per vendor across all
   * non-cancelled POs. No date window: outstanding is a now-snapshot.
   * Vendors with zero outstanding are filtered out.
   */
  async outstandingByVendor(
    organizationId: string,
    limit: number,
  ): Promise<Array<{ id: string; name: string; value: number; orderCount: number }>> {
    const rows = await this.repository
      .createQueryBuilder('po')
      .innerJoin('po.vendor', 'vendor')
      .select('vendor.id', 'id')
      .addSelect('vendor.name', 'name')
      .addSelect('SUM(po.total_amount - po.paid_amount)', 'value')
      .addSelect('COUNT(*)', 'orderCount')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.deletedAt IS NULL')
      .andWhere('po.status != :cancelled', { cancelled: PurchaseOrderStatus.CANCELLED })
      .groupBy('vendor.id')
      .addGroupBy('vendor.name')
      .having('SUM(po.total_amount - po.paid_amount) > 0')
      .orderBy('SUM(po.total_amount - po.paid_amount)', 'DESC')
      .limit(limit)
      .getRawMany<{ id: string; name: string; value: string | null; orderCount: string }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value ?? 0),
      orderCount: parseInt(r.orderCount, 10),
    }));
  }
}
