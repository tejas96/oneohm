import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InventoryTransactionType } from '@oneohm-epc/shared/types';
import { DataSource } from 'typeorm';

import { ProductRepository } from '../../master-data/repositories/product.repository';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';
import { WarehouseRepository } from '../repositories';
import { LowStockAlertService } from './low-stock-alert.service';

/**
 * Stock Transfer Service
 * Handles inter-warehouse stock transfers with pessimistic locking.
 */
@Injectable()
export class StockTransferService {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly productRepository: ProductRepository,
    private readonly lowStockAlertService: LowStockAlertService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async transferStock(
    organizationId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    productId: string,
    quantity: number,
    performedBy: string,
    notes?: string,
  ): Promise<void> {
    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Source and destination warehouse must be different');
    }

    await Promise.all([
      this.warehouseRepository.findById(fromWarehouseId, organizationId),
      this.warehouseRepository.findById(toWarehouseId, organizationId),
      this.productRepository.findById(productId, organizationId),
    ]);

    let sourceForAlert: InventoryStockEntity | null = null;
    let prevSourceAvailable = 0;
    let nextSourceAvailable = 0;

    await this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStockEntity);
      const sourceStock = await stockRepo
        .createQueryBuilder('stock')
        .where('stock.organizationId = :organizationId', { organizationId })
        .andWhere('stock.warehouseId = :warehouseId', { warehouseId: fromWarehouseId })
        .andWhere('stock.productId = :productId', { productId })
        .setLock('pessimistic_write')
        .getOne();

      if (!sourceStock) {
        throw new BadRequestException('Stock record not found');
      }

      prevSourceAvailable = Number(sourceStock.availableQuantity);
      if (prevSourceAvailable < quantity) {
        throw new BadRequestException('Insufficient stock available');
      }

      nextSourceAvailable = prevSourceAvailable - quantity;
      sourceStock.availableQuantity = nextSourceAvailable;
      sourceStock.updatedAt = new Date();
      await stockRepo.save(sourceStock);

      let destinationStock = await stockRepo
        .createQueryBuilder('stock')
        .where('stock.organizationId = :organizationId', { organizationId })
        .andWhere('stock.warehouseId = :warehouseId', { warehouseId: toWarehouseId })
        .andWhere('stock.productId = :productId', { productId })
        .setLock('pessimistic_write')
        .getOne();

      if (!destinationStock) {
        destinationStock = stockRepo.create({
          organizationId,
          warehouseId: toWarehouseId,
          productId,
          availableQuantity: 0,
          reservedQuantity: 0,
          inTransitQuantity: 0,
          minimumStockLevel: sourceStock.minimumStockLevel,
          maximumStockLevel: sourceStock.maximumStockLevel,
        });
      }

      destinationStock.availableQuantity = Number(destinationStock.availableQuantity) + quantity;
      destinationStock.updatedAt = new Date();
      await stockRepo.save(destinationStock);

      const { InventoryTransactionEntity } = await import(
        '../entities/inventory-transaction.entity'
      );
      const txnRepo = manager.getRepository(InventoryTransactionEntity);
      await txnRepo.save(
        txnRepo.create({
          organizationId,
          warehouseId: fromWarehouseId,
          productId,
          transactionType: InventoryTransactionType.TRANSFER_OUT,
          quantity,
          transactionDate: new Date(),
          referenceType: 'warehouse_transfer',
          referenceId: toWarehouseId,
          notes,
          createdBy: performedBy,
        }),
      );
      await txnRepo.save(
        txnRepo.create({
          organizationId,
          warehouseId: toWarehouseId,
          productId,
          transactionType: InventoryTransactionType.TRANSFER_IN,
          quantity,
          transactionDate: new Date(),
          referenceType: 'warehouse_transfer',
          referenceId: fromWarehouseId,
          notes,
          createdBy: performedBy,
        }),
      );

      sourceForAlert = sourceStock;
    });

    if (sourceForAlert) {
      this.lowStockAlertService.checkAndFire(
        organizationId,
        sourceForAlert,
        prevSourceAvailable,
        nextSourceAvailable,
        performedBy,
      );
    }
  }
}
