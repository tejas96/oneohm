import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InventoryTransactionType } from '@oneohm-epc/shared/types';
import { Repository } from 'typeorm';

import { InventoryTransactionEntity } from '../entities/inventory-transaction.entity';

/**
 * Inventory Transaction Repository
 * Handles database operations for inventory transactions
 */
@Injectable()
export class InventoryTransactionRepository {
  constructor(
    @InjectRepository(InventoryTransactionEntity)
    private readonly repository: Repository<InventoryTransactionEntity>,
  ) {}

  /**
   * Create a new inventory transaction
   */
  async create(txnData: Partial<InventoryTransactionEntity>): Promise<InventoryTransactionEntity> {
    const txn = this.repository.create(txnData);
    return this.repository.save(txn);
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<InventoryTransactionEntity> {
    const txn = await this.repository.findOne({
      where: { id },
      relations: ['warehouse', 'product', 'fromWarehouse', 'toWarehouse', 'performedBy'],
    });

    if (!txn) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return txn;
  }

  /**
   * Find all transactions with filters and pagination
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 50,
    filters?: {
      transactionType?: InventoryTransactionType;
      warehouseId?: string;
      productId?: string;
      fromDate?: string;
      toDate?: string;
      referenceType?: string;
      referenceId?: string;
    },
  ): Promise<{ transactions: InventoryTransactionEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('txn')
      .leftJoinAndSelect('txn.warehouse', 'warehouse')
      .leftJoinAndSelect('txn.product', 'product')
      .leftJoinAndSelect('txn.fromWarehouse', 'fromWarehouse')
      .leftJoinAndSelect('txn.toWarehouse', 'toWarehouse')
      .where('txn.organizationId = :organizationId', { organizationId });

    // Apply filters
    if (filters?.transactionType) {
      query.andWhere('txn.transactionType = :transactionType', {
        transactionType: filters.transactionType,
      });
    }

    if (filters?.warehouseId) {
      query.andWhere('txn.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters?.productId) {
      query.andWhere('txn.productId = :productId', { productId: filters.productId });
    }

    if (filters?.fromDate) {
      query.andWhere('txn.transactionDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('txn.transactionDate <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.referenceType && filters.referenceId) {
      query.andWhere('txn.referenceType = :referenceType', {
        referenceType: filters.referenceType,
      });
      query.andWhere('txn.referenceId = :referenceId', { referenceId: filters.referenceId });
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by
    query.orderBy('txn.transactionDate', 'DESC').addOrderBy('txn.createdAt', 'DESC');

    const [transactions, total] = await query.getManyAndCount();

    return { transactions, total };
  }

  /**
   * Find transactions by warehouse
   */
  async findByWarehouse(
    warehouseId: string,
    page = 1,
    limit = 50,
  ): Promise<{ transactions: InventoryTransactionEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('txn')
      .leftJoinAndSelect('txn.product', 'product')
      .where('txn.warehouseId = :warehouseId', { warehouseId })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('txn.transactionDate', 'DESC');

    const [transactions, total] = await query.getManyAndCount();

    return { transactions, total };
  }

  /**
   * Find transactions by product
   */
  async findByProduct(
    productId: string,
    organizationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ transactions: InventoryTransactionEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('txn')
      .leftJoinAndSelect('txn.warehouse', 'warehouse')
      .where('txn.productId = :productId', { productId })
      .andWhere('txn.organizationId = :organizationId', { organizationId })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('txn.transactionDate', 'DESC');

    const [transactions, total] = await query.getManyAndCount();

    return { transactions, total };
  }

  /**
   * Find transactions by reference
   */
  async findByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<InventoryTransactionEntity[]> {
    return this.repository.find({
      where: { referenceType, referenceId },
      relations: ['warehouse', 'product'],
      order: { transactionDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get transaction summary by type
   */
  async getTransactionSummaryByType(
    organizationId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<
    Array<{ transactionType: InventoryTransactionType; count: number; totalQuantity: number }>
  > {
    const query = this.repository
      .createQueryBuilder('txn')
      .select('txn.transactionType', 'transactionType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(txn.quantity)', 'totalQuantity')
      .where('txn.organizationId = :organizationId', { organizationId });

    if (fromDate) {
      query.andWhere('txn.transactionDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('txn.transactionDate <= :toDate', { toDate });
    }

    query.groupBy('txn.transactionType').orderBy('txn.transactionType', 'ASC');

    return query.getRawMany();
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(
    organizationId: string,
    limit = 10,
  ): Promise<InventoryTransactionEntity[]> {
    return this.repository.find({
      where: { organizationId },
      relations: ['warehouse', 'product', 'performedBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get stock movement history for a product
   */
  async getStockMovementHistory(
    productId: string,
    warehouseId: string,
    limit = 20,
  ): Promise<InventoryTransactionEntity[]> {
    return this.repository.find({
      where: { productId, warehouseId },
      relations: ['performedBy'],
      order: { transactionDate: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }
}
