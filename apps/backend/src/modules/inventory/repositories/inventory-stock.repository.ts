import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InventoryStockEntity } from '../entities/inventory-stock.entity';

/**
 * Inventory Stock Repository
 * Handles database operations for stock levels
 */
@Injectable()
export class InventoryStockRepository {
  constructor(
    @InjectRepository(InventoryStockEntity)
    private readonly repository: Repository<InventoryStockEntity>,
  ) {}

  /**
   * Create or update stock record
   */
  async upsert(stockData: Partial<InventoryStockEntity>): Promise<InventoryStockEntity> {
    // Try to find existing stock record
    const existing = await this.repository.findOne({
      where: {
        warehouseId: stockData.warehouseId!,
        productId: stockData.productId!,
      },
    });

    if (existing) {
      Object.assign(existing, stockData);
      return this.repository.save(existing);
    }

    const stock = this.repository.create(stockData);
    return this.repository.save(stock);
  }

  /**
   * Find stock by warehouse and product
   */
  async findByWarehouseAndProduct(
    warehouseId: string,
    productId: string,
  ): Promise<InventoryStockEntity | null> {
    return this.repository.findOne({
      where: { warehouseId, productId },
      relations: ['warehouse', 'product'],
    });
  }

  /**
   * Find stock by ID
   */
  async findById(id: string): Promise<InventoryStockEntity> {
    const stock = await this.repository.findOne({
      where: { id },
      relations: ['warehouse', 'product', 'organization'],
    });

    if (!stock) {
      throw new NotFoundException(`Stock record with ID ${id} not found`);
    }

    return stock;
  }

  /**
   * Find all stock for a warehouse
   */
  async findByWarehouse(
    warehouseId: string,
    page = 1,
    limit = 50,
    filters?: {
      lowStock?: boolean;
      search?: string;
    },
  ): Promise<{ stocks: InventoryStockEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.warehouse', 'warehouse')
      .where('stock.warehouseId = :warehouseId', { warehouseId });

    // Apply filters
    if (filters?.lowStock) {
      query.andWhere('stock.availableQuantity <= stock.minimumStockLevel');
    }

    if (filters?.search) {
      query.andWhere('product.name ILIKE :search OR product.code ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by
    query.orderBy('product.name', 'ASC');

    const [stocks, total] = await query.getManyAndCount();

    return { stocks, total };
  }

  /**
   * Find all stock for a product across warehouses
   */
  async findByProduct(productId: string, organizationId: string): Promise<InventoryStockEntity[]> {
    return this.repository.find({
      where: { productId, organizationId },
      relations: ['warehouse'],
      order: { warehouseId: 'ASC' },
    });
  }

  /**
   * Get low stock alerts
   */
  async findLowStock(organizationId: string): Promise<InventoryStockEntity[]> {
    return this.repository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.warehouse', 'warehouse')
      .leftJoinAndSelect('stock.product', 'product')
      .where('stock.organizationId = :organizationId', { organizationId })
      .andWhere('stock.availableQuantity <= stock.minimumStockLevel')
      .andWhere('warehouse.deletedAt IS NULL')
      .orderBy('stock.availableQuantity', 'ASC')
      .getMany();
  }

  /**
   * Update stock quantities
   */
  async updateQuantities(
    id: string,
    quantities: {
      availableQuantity?: number;
      reservedQuantity?: number;
      inTransitQuantity?: number;
      minimumStockLevel?: number;
      reorderQuantity?: number;
      maximumStockLevel?: number;
    },
  ): Promise<InventoryStockEntity> {
    const stock = await this.findById(id);

    Object.assign(stock, quantities);
    stock.updatedAt = new Date();

    return this.repository.save(stock);
  }

  /**
   * Get total stock value for organization
   */
  async getTotalStockValue(organizationId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('stock')
      .innerJoin('stock.product', 'product')
      .select('SUM(stock.availableQuantity * product.unitPrice)', 'totalValue')
      .where('stock.organizationId = :organizationId', { organizationId })
      .getRawOne<{ totalValue: string }>();

    return result?.totalValue ? parseFloat(result.totalValue) : 0;
  }

  /**
   * Get stock summary by warehouse
   */
  async getStockSummaryByWarehouse(
    organizationId: string,
  ): Promise<
    Array<{ warehouseId: string; warehouseName: string; totalItems: number; totalValue: number }>
  > {
    return this.repository
      .createQueryBuilder('stock')
      .innerJoin('stock.warehouse', 'warehouse')
      .innerJoin('stock.product', 'product')
      .select('warehouse.id', 'warehouseId')
      .addSelect('warehouse.name', 'warehouseName')
      .addSelect('COUNT(DISTINCT stock.productId)', 'totalItems')
      .addSelect('SUM(stock.availableQuantity * product.unitPrice)', 'totalValue')
      .where('stock.organizationId = :organizationId', { organizationId })
      .andWhere('warehouse.deletedAt IS NULL')
      .groupBy('warehouse.id')
      .addGroupBy('warehouse.name')
      .orderBy('warehouse.name', 'ASC')
      .getRawMany();
  }
}
