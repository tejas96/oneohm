import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InventoryTransactionType } from '@tejas96/shared/types';
import { DataSource, EntityManager } from 'typeorm';

import { ProductRepository } from '../../master-data/repositories/product.repository';
import { UpdateInventoryStockDto, UpdateStockDto } from '../dto';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';
import {
  InventoryStockRepository,
  InventoryTransactionRepository,
  WarehouseRepository,
} from '../repositories';
import { LowStockAlertService } from './low-stock-alert.service';
import { ReservedStockService } from './reserved-stock.service';
import { StockTransferService } from './stock-transfer.service';

/**
 * Inventory Stock Service
 * Business logic for stock management and tracking.
 * All multi-write methods that touch inventory_stock also write an inventory_transaction.
 */
@Injectable()
export class InventoryStockService {
  constructor(
    private readonly inventoryStockRepository: InventoryStockRepository,
    private readonly inventoryTransactionRepository: InventoryTransactionRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly productRepository: ProductRepository,
    private readonly lowStockAlertService: LowStockAlertService,
    private readonly reservedStockService: ReservedStockService,
    private readonly stockTransferService: StockTransferService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ==================== Read Methods ====================

  /**
   * Get stock by warehouse and product — validates warehouse belongs to org.
   */
  async getStock(
    organizationId: string,
    warehouseId: string,
    productId: string,
  ): Promise<InventoryStockEntity | null> {
    await this.warehouseRepository.findById(warehouseId, organizationId);
    return this.inventoryStockRepository.findByWarehouseAndProduct(
      warehouseId,
      productId,
      organizationId,
    );
  }

  /**
   * Get stock by stock row id.
   */
  async getStockById(id: string, organizationId: string): Promise<InventoryStockEntity> {
    return this.inventoryStockRepository.findById(id, organizationId);
  }

  /**
   * Get stock across organization with optional filters.
   */
  async getAllStock(
    organizationId: string,
    page = 1,
    limit = 50,
    filters?: {
      warehouseId?: string;
      productId?: string;
      lowStock?: boolean;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ stocks: InventoryStockEntity[]; total: number }> {
    return this.inventoryStockRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Get all stock for a warehouse — validates warehouse belongs to org.
   */
  async getStockByWarehouse(
    organizationId: string,
    warehouseId: string,
    page = 1,
    limit = 50,
    filters?: { lowStock?: boolean; search?: string },
  ): Promise<{ stocks: InventoryStockEntity[]; total: number }> {
    await this.warehouseRepository.findById(warehouseId, organizationId);
    return this.inventoryStockRepository.findByWarehouse(warehouseId, page, limit, filters);
  }

  /**
   * Get all stock for a product across warehouses.
   */
  async getStockByProduct(
    productId: string,
    organizationId: string,
  ): Promise<InventoryStockEntity[]> {
    return this.inventoryStockRepository.findByProduct(productId, organizationId);
  }

  /**
   * Get low stock alerts.
   */
  async getLowStockAlerts(organizationId: string): Promise<InventoryStockEntity[]> {
    return this.inventoryStockRepository.findLowStock(organizationId);
  }

  /**
   * Get total stock value.
   */
  async getTotalStockValue(organizationId: string): Promise<number> {
    return this.inventoryStockRepository.getTotalStockValue(organizationId);
  }

  /**
   * Get stock summary by warehouse.
   */
  async getStockSummaryByWarehouse(
    organizationId: string,
  ): Promise<
    Array<{ warehouseId: string; warehouseName: string; totalItems: number; totalValue: number }>
  > {
    return this.inventoryStockRepository.getStockSummaryByWarehouse(organizationId);
  }

  // ==================== Mutation Methods ====================

  /**
   * Generic stock update — validates warehouse + product ownership, creates transaction record.
   * All convenience methods delegate here.
   */
  async updateStock(updateDto: UpdateStockDto, performedBy: string): Promise<InventoryStockEntity> {
    if (!updateDto.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const [warehouse, product] = await Promise.all([
      this.warehouseRepository.findById(updateDto.warehouseId, updateDto.organizationId),
      this.productRepository.findById(updateDto.productId, updateDto.organizationId),
    ]);

    if (!warehouse) throw new NotFoundException('Warehouse not found');
    if (!product) throw new NotFoundException('Product not found');

    let stock = await this.inventoryStockRepository.findByWarehouseAndProduct(
      updateDto.warehouseId,
      updateDto.productId,
      updateDto.organizationId,
    );

    if (!stock) {
      stock = await this.inventoryStockRepository.upsert({
        organizationId: updateDto.organizationId,
        warehouseId: updateDto.warehouseId,
        productId: updateDto.productId,
        availableQuantity: 0,
        reservedQuantity: 0,
        inTransitQuantity: 0,
        minimumStockLevel: updateDto.minimumStockLevel ?? 0,
        maximumStockLevel: updateDto.maximumStockLevel,
      });
    }

    const newAvailableQuantity = Number(stock.availableQuantity) + updateDto.quantity;
    if (newAvailableQuantity < 0) {
      throw new BadRequestException('Insufficient stock available');
    }

    const prevAvailable = Number(stock.availableQuantity);
    const updatedStock = await this.inventoryStockRepository.updateQuantities(stock.id, {
      availableQuantity: newAvailableQuantity,
      minimumStockLevel: updateDto.minimumStockLevel,
      maximumStockLevel: updateDto.maximumStockLevel,
    });

    await this.inventoryTransactionRepository.create({
      organizationId: updateDto.organizationId,
      warehouseId: updateDto.warehouseId,
      productId: updateDto.productId,
      transactionType: updateDto.transactionType,
      quantity: Math.abs(updateDto.quantity),
      transactionDate: new Date(),
      referenceType: updateDto.referenceType,
      referenceId: updateDto.referenceId,
      notes: updateDto.notes,
      createdBy: performedBy,
    });

    if (updateDto.quantity < 0) {
      this.lowStockAlertService.checkAndFire(
        updateDto.organizationId,
        stock,
        prevAvailable,
        newAvailableQuantity,
        performedBy,
      );
    }

    return updatedStock;
  }

  /**
   * Add stock (e.g. on PO receive). Optionally accepts an EntityManager for transactional use.
   */
  async addStock(
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    performedBy: string,
    notes?: string,
    manager?: EntityManager,
  ): Promise<InventoryStockEntity> {
    if (manager) {
      return this.reservedStockService.addStockWithManager(
        manager,
        organizationId,
        warehouseId,
        productId,
        quantity,
        referenceType,
        referenceId,
        performedBy,
        notes,
      );
    }
    return this.updateStock(
      {
        organizationId,
        warehouseId,
        productId,
        quantity,
        transactionType: InventoryTransactionType.PURCHASE,
        referenceType,
        referenceId,
        notes,
      },
      performedBy,
    );
  }

  /**
   * Remove stock (convenience). Deducts from available.
   */
  async removeStock(
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    performedBy: string,
    notes?: string,
  ): Promise<InventoryStockEntity> {
    return this.updateStock(
      {
        organizationId,
        warehouseId,
        productId,
        quantity: -quantity,
        transactionType: InventoryTransactionType.DISPATCH,
        referenceType,
        referenceId,
        notes,
      },
      performedBy,
    );
  }

  async transferStock(
    organizationId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    productId: string,
    quantity: number,
    performedBy: string,
    notes?: string,
  ): Promise<void> {
    return this.stockTransferService.transferStock(
      organizationId,
      fromWarehouseId,
      toWarehouseId,
      productId,
      quantity,
      performedBy,
      notes,
    );
  }

  /**
   * Adjust stock to a new absolute quantity.
   */
  async adjustStock(
    organizationId: string,
    warehouseId: string,
    productId: string,
    newQuantity: number,
    performedBy: string,
    reason: string,
  ): Promise<InventoryStockEntity> {
    const stock = await this.inventoryStockRepository.findByWarehouseAndProduct(
      warehouseId,
      productId,
      organizationId,
    );
    if (!stock) throw new BadRequestException('Stock record not found');

    const adjustment = newQuantity - Number(stock.availableQuantity);
    return this.updateStock(
      {
        organizationId,
        warehouseId,
        productId,
        quantity: adjustment,
        transactionType: InventoryTransactionType.ADJUSTMENT,
        referenceType: 'manual_adjustment',
        referenceId: stock.id,
        notes: `[REASON: ${reason}]`,
      },
      performedBy,
    );
  }

  /**
   * Reserve stock for allocation — moves available → reserved.
   * Writes an ALLOCATION transaction.
   */
  async reserveStock(
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    performedBy: string,
    referenceId?: string,
  ): Promise<void> {
    let stockForAlert: InventoryStockEntity | null = null;
    let prevAvailable = 0;
    let newAvailable = 0;

    await this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStockEntity);
      const stock = await stockRepo
        .createQueryBuilder('stock')
        .where('stock.warehouseId = :warehouseId', { warehouseId })
        .andWhere('stock.productId = :productId', { productId })
        .andWhere('stock.organizationId = :organizationId', { organizationId })
        .setLock('pessimistic_write')
        .getOne();

      if (!stock) throw new BadRequestException('Stock record not found');
      if (Number(stock.availableQuantity) < quantity)
        throw new BadRequestException('Insufficient available stock');

      prevAvailable = Number(stock.availableQuantity);
      newAvailable = prevAvailable - quantity;

      stock.availableQuantity = newAvailable;
      stock.reservedQuantity = Number(stock.reservedQuantity) + quantity;
      stock.updatedAt = new Date();
      await stockRepo.save(stock);

      const { InventoryTransactionEntity: TxnEntity } = await import(
        '../entities/inventory-transaction.entity'
      );
      const txnRepo = manager.getRepository(TxnEntity);
      await txnRepo.save(
        txnRepo.create({
          organizationId,
          warehouseId,
          productId,
          transactionType: InventoryTransactionType.ALLOCATION,
          quantity,
          transactionDate: new Date(),
          referenceType: 'stock_allocation',
          referenceId,
          notes: 'Stock reserved for allocation',
          createdBy: performedBy,
        }),
      );

      stockForAlert = stock;
    });

    if (stockForAlert) {
      this.lowStockAlertService.checkAndFire(
        organizationId,
        stockForAlert,
        prevAvailable,
        newAvailable,
        performedBy,
      );
    }
  }

  /**
   * Release reserved stock — moves reserved → available.
   * Writes a reverse ALLOCATION transaction.
   */
  async releaseStock(
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    performedBy: string,
    referenceId?: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStockEntity);
      const stock = await stockRepo
        .createQueryBuilder('stock')
        .where('stock.warehouseId = :warehouseId', { warehouseId })
        .andWhere('stock.productId = :productId', { productId })
        .andWhere('stock.organizationId = :organizationId', { organizationId })
        .setLock('pessimistic_write')
        .getOne();

      if (!stock) throw new BadRequestException('Stock record not found');
      if (Number(stock.reservedQuantity) < quantity)
        throw new BadRequestException('Insufficient reserved stock');

      stock.availableQuantity = Number(stock.availableQuantity) + quantity;
      stock.reservedQuantity = Number(stock.reservedQuantity) - quantity;
      stock.updatedAt = new Date();
      await stockRepo.save(stock);

      const { InventoryTransactionEntity: TxnEntity } = await import(
        '../entities/inventory-transaction.entity'
      );
      const txnRepo = manager.getRepository(TxnEntity);
      await txnRepo.save(
        txnRepo.create({
          organizationId,
          warehouseId,
          productId,
          transactionType: InventoryTransactionType.ALLOCATION,
          quantity,
          transactionDate: new Date(),
          referenceType: 'stock_allocation',
          referenceId,
          notes: 'Reserved stock released from allocation',
          createdBy: performedBy,
        }),
      );
    });
  }

  async restoreReservedStock(
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    performedBy: string,
    notes?: string,
    manager?: EntityManager,
  ): Promise<void> {
    return this.reservedStockService.restoreReservedStock(
      organizationId,
      warehouseId,
      productId,
      quantity,
      referenceType,
      referenceId,
      performedBy,
      notes,
      manager,
    );
  }

  async deductReservedStock(
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    performedBy: string,
    notes?: string,
    manager?: EntityManager,
  ): Promise<void> {
    return this.reservedStockService.deductReservedStock(
      organizationId,
      warehouseId,
      productId,
      quantity,
      referenceType,
      referenceId,
      performedBy,
      notes,
      manager,
    );
  }

  /**
   * Update stock settings (thresholds only, no quantity changes)
   */
  async updateStockSettings(
    stockId: string,
    updateDto: UpdateInventoryStockDto,
  ): Promise<InventoryStockEntity> {
    const stock = await this.inventoryStockRepository.findById(stockId);

    return this.inventoryStockRepository.updateQuantities(stock.id, {
      minimumStockLevel: updateDto.minimumStockLevel,
      maximumStockLevel: updateDto.maximumStockLevel,
      reorderQuantity: updateDto.reorderQuantity,
    });
  }
}
