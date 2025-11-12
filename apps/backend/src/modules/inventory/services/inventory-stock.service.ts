import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType } from '@oneohm-epc/shared-types';

import { ProductRepository } from '../../products/repositories/product.repository';
import { UpdateStockDto } from '../dto';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';
import {
  InventoryStockRepository,
  InventoryTransactionRepository,
  WarehouseRepository,
} from '../repositories';

/**
 * Inventory Stock Service
 * Business logic for stock management and tracking
 */
@Injectable()
export class InventoryStockService {
  constructor(
    private readonly inventoryStockRepository: InventoryStockRepository,
    private readonly inventoryTransactionRepository: InventoryTransactionRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  /**
   * Get stock by warehouse and product
   */
  async getStock(warehouseId: string, productId: string): Promise<InventoryStockEntity | null> {
    return this.inventoryStockRepository.findByWarehouseAndProduct(warehouseId, productId);
  }

  /**
   * Get all stock for a warehouse
   */
  async getStockByWarehouse(
    warehouseId: string,
    page = 1,
    limit = 50,
    filters?: {
      lowStock?: boolean;
      search?: string;
    },
  ): Promise<{ stocks: InventoryStockEntity[]; total: number }> {
    return this.inventoryStockRepository.findByWarehouse(warehouseId, page, limit, filters);
  }

  /**
   * Get all stock for a product across warehouses
   */
  async getStockByProduct(
    productId: string,
    organizationId: string,
  ): Promise<InventoryStockEntity[]> {
    return this.inventoryStockRepository.findByProduct(productId, organizationId);
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(organizationId: string): Promise<InventoryStockEntity[]> {
    return this.inventoryStockRepository.findLowStock(organizationId);
  }

  /**
   * Update stock levels (generic method)
   */
  async updateStock(updateDto: UpdateStockDto, performedBy: string): Promise<InventoryStockEntity> {
    if (!updateDto.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify warehouse exists
    const warehouse = await this.warehouseRepository.findById(
      updateDto.warehouseId,
      updateDto.organizationId,
    );

    // Verify product exists
    const product = await this.productRepository.findById(
      updateDto.productId,
      updateDto.organizationId,
    );

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get or create stock record
    let stock = await this.inventoryStockRepository.findByWarehouseAndProduct(
      updateDto.warehouseId,
      updateDto.productId,
    );

    if (!stock) {
      // Create new stock record
      stock = await this.inventoryStockRepository.upsert({
        organizationId: updateDto.organizationId,
        warehouseId: updateDto.warehouseId,
        productId: updateDto.productId,
        availableQuantity: 0,
        reservedQuantity: 0,
        inTransitQuantity: 0,
        minimumStockLevel: updateDto.minimumStockLevel || 0,
        maximumStockLevel: updateDto.maximumStockLevel,
      });
    }

    const quantityChange = updateDto.quantity;

    // Calculate new quantities
    const newAvailableQuantity = stock.availableQuantity + quantityChange;

    if (newAvailableQuantity < 0) {
      throw new BadRequestException('Insufficient stock available');
    }

    // Update stock
    const updatedStock = await this.inventoryStockRepository.updateQuantities(stock.id, {
      availableQuantity: newAvailableQuantity,
      minimumStockLevel: updateDto.minimumStockLevel,
      maximumStockLevel: updateDto.maximumStockLevel,
    });

    // Create transaction record
    await this.inventoryTransactionRepository.create({
      organizationId: updateDto.organizationId,
      warehouseId: updateDto.warehouseId,
      productId: updateDto.productId,
      transactionType: updateDto.transactionType,
      quantity: Math.abs(quantityChange),
      transactionDate: new Date(),
      referenceType: updateDto.referenceType,
      referenceId: updateDto.referenceId,
      notes: updateDto.notes,
      createdBy: performedBy,
    });

    return updatedStock;
  }

  /**
   * Add stock (convenience method)
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
  ): Promise<InventoryStockEntity> {
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
   * Remove stock (convenience method)
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

  /**
   * Transfer stock between warehouses
   */
  async transferStock(
    organizationId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    productId: string,
    quantity: number,
    performedBy: string,
    notes?: string,
  ): Promise<void> {
    // Verify both warehouses exist
    await Promise.all([
      this.warehouseRepository.findById(fromWarehouseId, organizationId),
      this.warehouseRepository.findById(toWarehouseId, organizationId),
    ]);

    // Remove from source warehouse
    await this.updateStock(
      {
        organizationId,
        warehouseId: fromWarehouseId,
        productId,
        quantity: -quantity,
        transactionType: InventoryTransactionType.TRANSFER_OUT,
        referenceType: 'warehouse_transfer',
        referenceId: toWarehouseId,
        notes,
      },
      performedBy,
    );

    // Add to destination warehouse
    await this.updateStock(
      {
        organizationId,
        warehouseId: toWarehouseId,
        productId,
        quantity,
        transactionType: InventoryTransactionType.TRANSFER_IN,
        referenceType: 'warehouse_transfer',
        referenceId: fromWarehouseId,
        notes,
      },
      performedBy,
    );
  }

  /**
   * Adjust stock (for corrections)
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
    );

    if (!stock) {
      throw new BadRequestException('Stock record not found');
    }

    const adjustment = newQuantity - stock.availableQuantity;

    return this.updateStock(
      {
        organizationId,
        warehouseId,
        productId,
        quantity: adjustment,
        transactionType: InventoryTransactionType.ADJUSTMENT,
        referenceType: 'manual_adjustment',
        referenceId: stock.id,
        notes: `Adjustment: ${reason}`,
      },
      performedBy,
    );
  }

  /**
   * Get total stock value
   */
  async getTotalStockValue(organizationId: string): Promise<number> {
    return this.inventoryStockRepository.getTotalStockValue(organizationId);
  }

  /**
   * Get stock summary by warehouse
   */
  async getStockSummaryByWarehouse(organizationId: string) {
    return this.inventoryStockRepository.getStockSummaryByWarehouse(organizationId);
  }

  /**
   * Reserve stock (allocate for project)
   */
  async reserveStock(warehouseId: string, productId: string, quantity: number): Promise<void> {
    const stock = await this.inventoryStockRepository.findByWarehouseAndProduct(
      warehouseId,
      productId,
    );

    if (!stock) {
      throw new BadRequestException('Stock record not found');
    }

    if (stock.availableQuantity < quantity) {
      throw new BadRequestException('Insufficient available stock');
    }

    await this.inventoryStockRepository.updateQuantities(stock.id, {
      availableQuantity: stock.availableQuantity - quantity,
      reservedQuantity: stock.reservedQuantity + quantity,
    });
  }

  /**
   * Release reserved stock
   */
  async releaseStock(warehouseId: string, productId: string, quantity: number): Promise<void> {
    const stock = await this.inventoryStockRepository.findByWarehouseAndProduct(
      warehouseId,
      productId,
    );

    if (!stock) {
      throw new BadRequestException('Stock record not found');
    }

    if (stock.reservedQuantity < quantity) {
      throw new BadRequestException('Insufficient reserved stock');
    }

    await this.inventoryStockRepository.updateQuantities(stock.id, {
      availableQuantity: stock.availableQuantity + quantity,
      reservedQuantity: stock.reservedQuantity - quantity,
    });
  }
}
