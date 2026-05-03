import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InventoryTransactionType } from '@oneohm-epc/shared/types';
import { DataSource, EntityManager } from 'typeorm';

import { InventoryStockEntity } from '../entities/inventory-stock.entity';

/**
 * Reserved Stock Service
 * Handles transactional stock helpers: deduction/restoration of reserved stock,
 * and addStock within an existing transaction.
 * All operations use pessimistic locks.
 */
@Injectable()
export class ReservedStockService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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
    if (manager) {
      await this.deductWithManager(
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
      return;
    }

    await this.dataSource.transaction(async (txManager) => {
      await this.deductWithManager(
        txManager,
        organizationId,
        warehouseId,
        productId,
        quantity,
        referenceType,
        referenceId,
        performedBy,
        notes,
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
    if (manager) {
      await this.restoreWithManager(
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
      return;
    }

    await this.dataSource.transaction(async (txManager) => {
      await this.restoreWithManager(
        txManager,
        organizationId,
        warehouseId,
        productId,
        quantity,
        referenceType,
        referenceId,
        performedBy,
        notes,
      );
    });
  }

  private async deductWithManager(
    manager: EntityManager,
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    performedBy: string,
    notes?: string,
  ): Promise<void> {
    const stockRepo = manager.getRepository(InventoryStockEntity);

    const stock = await stockRepo
      .createQueryBuilder('stock')
      .where('stock.warehouseId = :warehouseId', { warehouseId })
      .andWhere('stock.productId = :productId', { productId })
      .setLock('pessimistic_write')
      .getOne();

    if (!stock) throw new NotFoundException('Stock record not found');
    if (Number(stock.reservedQuantity) < quantity) {
      throw new BadRequestException('Insufficient reserved stock for dispatch');
    }

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
        transactionType: InventoryTransactionType.DISPATCH,
        quantity,
        transactionDate: new Date(),
        referenceType,
        referenceId,
        notes,
        createdBy: performedBy,
      }),
    );
  }

  private async restoreWithManager(
    manager: EntityManager,
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    performedBy: string,
    notes?: string,
  ): Promise<void> {
    const stockRepo = manager.getRepository(InventoryStockEntity);

    const stock = await stockRepo
      .createQueryBuilder('stock')
      .where('stock.warehouseId = :warehouseId', { warehouseId })
      .andWhere('stock.productId = :productId', { productId })
      .setLock('pessimistic_write')
      .getOne();

    if (!stock) {
      throw new NotFoundException('Stock record not found');
    }

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
        referenceType,
        referenceId,
        notes: notes ?? 'Dispatch cancelled: quantity restored to reserved stock',
        createdBy: performedBy,
      }),
    );
  }

  async addStockWithManager(
    manager: EntityManager,
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    performedBy: string,
    notes?: string,
  ): Promise<InventoryStockEntity> {
    const stockRepo = manager.getRepository(InventoryStockEntity);

    let stock = await stockRepo
      .createQueryBuilder('stock')
      .where('stock.warehouseId = :warehouseId', { warehouseId })
      .andWhere('stock.productId = :productId', { productId })
      .setLock('pessimistic_write')
      .getOne();

    if (!stock) {
      const newStock = stockRepo.create({
        organizationId,
        warehouseId,
        productId,
        availableQuantity: quantity,
        reservedQuantity: 0,
        inTransitQuantity: 0,
      });
      stock = await stockRepo.save(newStock);
    } else {
      stock.availableQuantity = Number(stock.availableQuantity) + quantity;
      stock.updatedAt = new Date();
      stock = await stockRepo.save(stock);
    }

    const { InventoryTransactionEntity: TxnEntity } = await import(
      '../entities/inventory-transaction.entity'
    );
    const txnRepo = manager.getRepository(TxnEntity);
    await txnRepo.save(
      txnRepo.create({
        organizationId,
        warehouseId,
        productId,
        transactionType: InventoryTransactionType.PURCHASE,
        quantity,
        transactionDate: new Date(),
        referenceType,
        referenceId,
        notes,
        createdBy: performedBy,
      }),
    );

    return stock;
  }
}
