import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

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
    try {
      return await this.repository.save(stock);
    } catch (error: unknown) {
      const isUniqueViolation =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23505';

      if (!isUniqueViolation) {
        throw error;
      }

      const conflictingRow = await this.repository.findOne({
        where: {
          warehouseId: stockData.warehouseId!,
          productId: stockData.productId!,
        },
      });

      if (!conflictingRow) {
        throw error;
      }

      return conflictingRow;
    }
  }

  /**
   * Returns true if any stock row for the warehouse has non-zero available, reserved, or in-transit quantity.
   */
  async hasActiveStock(warehouseId: string): Promise<boolean> {
    const row = await this.repository
      .createQueryBuilder('stock')
      .where('stock.warehouseId = :warehouseId', { warehouseId })
      .andWhere(
        '(stock.availableQuantity > 0 OR stock.reservedQuantity > 0 OR stock.inTransitQuantity > 0)',
      )
      .limit(1)
      .getOne();

    return row !== null;
  }

  /**
   * Find stock by warehouse and product (optionally org-scoped)
   */
  async findByWarehouseAndProduct(
    warehouseId: string,
    productId: string,
    organizationId?: string,
  ): Promise<InventoryStockEntity | null> {
    const where: Record<string, string> = { warehouseId, productId };
    if (organizationId) where.organizationId = organizationId;
    return this.repository.findOne({
      where,
      relations: ['warehouse', 'product'],
    });
  }

  /**
   * Find stock with pessimistic write lock (must be inside a transaction manager)
   */
  async findForUpdate(
    warehouseId: string,
    productId: string,
    manager: EntityManager,
  ): Promise<InventoryStockEntity | null> {
    const result = await manager
      .getRepository(InventoryStockEntity)
      .createQueryBuilder('stock')
      .where('stock.warehouseId = :warehouseId', { warehouseId })
      .andWhere('stock.productId = :productId', { productId })
      .setLock('pessimistic_write')
      .getOne();
    return result ?? null;
  }

  /**
   * Find stock by ID (optionally org-scoped)
   */
  async findById(id: string, organizationId?: string): Promise<InventoryStockEntity> {
    const where: Record<string, string> = { id };
    if (organizationId) where.organizationId = organizationId;
    const stock = await this.repository.findOne({
      where,
      relations: ['warehouse', 'product'],
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
      .where('stock.warehouseId = :warehouseId', { warehouseId })
      .andWhere('product.deletedAt IS NULL')
      .andWhere('warehouse.deletedAt IS NULL');

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

    // Split getCount + getMany to avoid TypeORM getManyAndCount crash
    // when leftJoinAndSelect is combined with orderBy on a joined alias.
    const total = await query.getCount();
    const stocks = await query.skip(skip).take(limit).getMany();

    return { stocks, total };
  }

  /**
   * Find stock across organization with filters and pagination
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 50,
    filters?: {
      warehouseId?: string;
      productId?: string;
      lowStock?: boolean;
      search?: string;
    },
  ): Promise<{ stocks: InventoryStockEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.warehouse', 'warehouse')
      .where('stock.organizationId = :organizationId', { organizationId })
      .andWhere('product.deletedAt IS NULL')
      .andWhere('warehouse.deletedAt IS NULL');

    if (filters?.warehouseId) {
      query.andWhere('stock.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters?.productId) {
      query.andWhere('stock.productId = :productId', { productId: filters.productId });
    }

    if (filters?.lowStock) {
      query.andWhere('stock.availableQuantity <= stock.minimumStockLevel');
    }

    if (filters?.search) {
      query.andWhere(
        '(product.name ILIKE :search OR product.code ILIKE :search OR warehouse.name ILIKE :search OR warehouse.code ILIKE :search)',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);
    query.orderBy('stock.updatedAt', 'DESC');

    const total = await query.getCount();
    const stocks = await query.skip(skip).take(limit).getMany();

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
   * Uses product_prices for unit price (ProductEntity no longer has unitPrice)
   */
  async getTotalStockValue(organizationId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('stock')
      .select(
        `SUM(stock.available_quantity * COALESCE((
          SELECT pp.unit_price::numeric
          FROM product_prices pp
          WHERE pp.product_id = stock.product_id
            AND pp.organization_id = stock.organization_id
            AND pp.is_active = true
            AND pp.effective_from <= CURRENT_DATE
            AND (pp.effective_to IS NULL OR pp.effective_to >= CURRENT_DATE)
            AND pp.project_type IS NULL
          ORDER BY pp.effective_from DESC
          LIMIT 1
        ), 0))`,
        'totalValue',
      )
      .where('stock.organization_id = :organizationId', { organizationId })
      .getRawOne<{ totalValue: string }>();

    return result?.totalValue ? parseFloat(result.totalValue) : 0;
  }

  /**
   * Get stock summary by warehouse
   * Uses product_prices for unit price (ProductEntity no longer has unitPrice)
   */
  async getStockSummaryByWarehouse(
    organizationId: string,
  ): Promise<
    Array<{ warehouseId: string; warehouseName: string; totalItems: number; totalValue: number }>
  > {
    const rows = await this.repository
      .createQueryBuilder('stock')
      .innerJoin('stock.warehouse', 'warehouse')
      .select('warehouse.id', 'warehouseId')
      .addSelect('warehouse.name', 'warehouseName')
      .addSelect('COUNT(DISTINCT stock.product_id)', 'totalItems')
      .addSelect(
        `SUM(stock.available_quantity * COALESCE((
          SELECT pp.unit_price::numeric
          FROM product_prices pp
          WHERE pp.product_id = stock.product_id
            AND pp.organization_id = stock.organization_id
            AND pp.is_active = true
            AND pp.effective_from <= CURRENT_DATE
            AND (pp.effective_to IS NULL OR pp.effective_to >= CURRENT_DATE)
            AND pp.project_type IS NULL
          ORDER BY pp.effective_from DESC
          LIMIT 1
        ), 0))`,
        'totalValue',
      )
      .where('stock.organization_id = :organizationId', { organizationId })
      .andWhere('warehouse.deleted_at IS NULL')
      .groupBy('warehouse.id')
      .addGroupBy('warehouse.name')
      .orderBy('warehouse.name', 'ASC')
      .getRawMany<{
        warehouseId: string;
        warehouseName: string;
        totalItems: string;
        totalValue: string;
      }>();

    return rows.map((r) => ({
      warehouseId: r.warehouseId,
      warehouseName: r.warehouseName,
      totalItems: parseInt(r.totalItems, 10),
      totalValue: r.totalValue ? parseFloat(r.totalValue) : 0,
    }));
  }
}
