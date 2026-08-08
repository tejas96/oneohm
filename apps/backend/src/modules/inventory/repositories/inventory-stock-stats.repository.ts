import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InventoryStockEntity } from '../entities/inventory-stock.entity';

/**
 * Read-only aggregation for the top-low-stock chart.
 *
 * "Low stock" predicate matches the existing `lowStock=true` filter
 * elsewhere in the codebase: `available_quantity <= minimum_stock_level`.
 * Postgres treats `NULL <= anything` as NULL (i.e. false), so rows
 * with no minimumStockLevel are correctly excluded — same behaviour
 * as the rest of the inventory queries.
 */
@Injectable()
export class InventoryStockStatsRepository {
  constructor(
    @InjectRepository(InventoryStockEntity)
    private readonly repository: Repository<InventoryStockEntity>,
  ) {}

  async topLowStock(limit: number): Promise<
    Array<{
      id: string;
      productName: string;
      productCode: string | null;
      warehouseName: string;
      availableQuantity: number;
      minimumStockLevel: number;
      deficit: number;
    }>
  > {
    const rows = await this.repository
      .createQueryBuilder('stock')
      .innerJoin('stock.product', 'product')
      .innerJoin('stock.warehouse', 'warehouse')
      .select('stock.id', 'id')
      .addSelect('product.name', 'productName')
      .addSelect('product.code', 'productCode')
      .addSelect('warehouse.name', 'warehouseName')
      .addSelect('stock.availableQuantity', 'availableQuantity')
      .addSelect('stock.minimumStockLevel', 'minimumStockLevel')
      .addSelect('(stock.minimumStockLevel - stock.availableQuantity)', 'deficit')
      .andWhere('product.deletedAt IS NULL')
      .andWhere('warehouse.deletedAt IS NULL')
      .andWhere('stock.minimumStockLevel IS NOT NULL')
      .andWhere('stock.availableQuantity <= stock.minimumStockLevel')
      .orderBy('deficit', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: string;
        productName: string;
        productCode: string | null;
        warehouseName: string;
        availableQuantity: string;
        minimumStockLevel: string;
        deficit: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      productName: r.productName,
      productCode: r.productCode,
      warehouseName: r.warehouseName,
      availableQuantity: Number(r.availableQuantity),
      minimumStockLevel: Number(r.minimumStockLevel),
      deficit: Number(r.deficit),
    }));
  }
}
