import { Injectable } from '@nestjs/common';
import { InventoryTransactionType } from '@tejas96/shared/types';
import { parsePaginationParams } from '@tejas96/shared/utils';

import { InventoryTransactionEntity } from '../entities/inventory-transaction.entity';
import { InventoryTransactionRepository } from '../repositories';

/**
 * Inventory Transaction Service
 * Read-only view of all stock movements. Transactions are written by stock mutation methods.
 */
@Injectable()
export class InventoryTransactionService {
  constructor(private readonly inventoryTransactionRepository: InventoryTransactionRepository) {}

  async findAll(
    organizationId: string,
    rawPage?: number,
    rawLimit?: number,
    filters?: {
      transactionType?: InventoryTransactionType;
      warehouseId?: string;
      productId?: string;
      fromDate?: string;
      toDate?: string;
      referenceType?: string;
      referenceId?: string;
    },
  ): Promise<{
    transactions: InventoryTransactionEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = parsePaginationParams(rawPage, rawLimit);
    const { transactions, total } = await this.inventoryTransactionRepository.findAll(
      organizationId,
      page,
      limit,
      filters,
    );
    return { transactions, total, page, limit };
  }

  async findById(id: string, organizationId: string): Promise<InventoryTransactionEntity> {
    return this.inventoryTransactionRepository.findById(id, organizationId);
  }

  async findByProduct(
    productId: string,
    organizationId: string,
    rawPage?: number,
    rawLimit?: number,
  ): Promise<{
    transactions: InventoryTransactionEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = parsePaginationParams(rawPage, rawLimit);
    const { transactions, total } = await this.inventoryTransactionRepository.findByProduct(
      productId,
      organizationId,
      page,
      limit,
    );
    return { transactions, total, page, limit };
  }

  async getRecentTransactions(
    organizationId: string,
    limitCount = 10,
  ): Promise<InventoryTransactionEntity[]> {
    return this.inventoryTransactionRepository.getRecentTransactions(organizationId, limitCount);
  }

  async getSummaryByType(
    organizationId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<
    Array<{ transactionType: InventoryTransactionType; count: number; totalQuantity: number }>
  > {
    return this.inventoryTransactionRepository.getTransactionSummaryByType(
      organizationId,
      fromDate,
      toDate,
    );
  }
}
