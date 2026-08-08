import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PurchaseOrderItemEntity } from '../entities/purchase-order-item.entity';

/**
 * Purchase Order Item Repository
 * Handles database operations for purchase order items
 */
@Injectable()
export class PurchaseOrderItemRepository {
  constructor(
    @InjectRepository(PurchaseOrderItemEntity)
    private readonly repository: Repository<PurchaseOrderItemEntity>,
  ) {}

  /**
   * Create a new purchase order item
   */
  async create(itemData: Partial<PurchaseOrderItemEntity>): Promise<PurchaseOrderItemEntity> {
    const item = this.repository.create(itemData);
    return this.repository.save(item);
  }

  /**
   * Create multiple purchase order items
   */
  async createMany(
    itemsData: Partial<PurchaseOrderItemEntity>[],
  ): Promise<PurchaseOrderItemEntity[]> {
    const items = this.repository.create(itemsData);
    return this.repository.save(items);
  }

  /**
   * Find purchase order item by ID
   */
  async findById(id: string): Promise<PurchaseOrderItemEntity> {
    const item = await this.repository.findOne({
      where: { id },
      relations: ['purchaseOrder', 'product'],
    });

    if (!item) {
      throw new NotFoundException(`Purchase Order Item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Find all items for a purchase order
   */
  async findByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderItemEntity[]> {
    return this.repository.find({
      where: { purchaseOrderId },
      relations: ['product'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Update purchase order item
   */
  async update(id: string, updateData: Record<string, unknown>): Promise<PurchaseOrderItemEntity> {
    const item = await this.findById(id);

    Object.assign(item, updateData);

    return this.repository.save(item);
  }

  /**
   * Delete purchase order item
   */
  async delete(id: string): Promise<void> {
    const item = await this.findById(id);
    await this.repository.remove(item);
  }

  /**
   * Delete all items for a purchase order
   */
  async deleteByPurchaseOrder(purchaseOrderId: string): Promise<void> {
    await this.repository.delete({ purchaseOrderId });
  }

  /**
   * Get total quantity ordered for a product
   */
  async getTotalOrderedQuantity(productId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('item')
      .innerJoin('item.purchaseOrder', 'purchaseOrder')
      .select('SUM(item.orderedQuantity)', 'totalQuantity')
      .where('item.productId = :productId', { productId })
      .andWhere('purchaseOrder.status IN (:...statuses)', {
        statuses: ['sent', 'confirmed', 'partially_received'],
      })
      .getRawOne<{ totalQuantity: string }>();

    return result?.totalQuantity ? parseFloat(result.totalQuantity) : 0;
  }

  /**
   * Get total received quantity for a product
   */
  async getTotalReceivedQuantity(productId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('item')
      .innerJoin('item.purchaseOrder', 'purchaseOrder')
      .select('SUM(item.receivedQuantity)', 'totalQuantity')
      .where('item.productId = :productId', { productId })
      .getRawOne<{ totalQuantity: string }>();

    return result?.totalQuantity ? parseFloat(result.totalQuantity) : 0;
  }

  /**
   * Get pending items (ordered but not fully received)
   */
  async getPendingItems(purchaseOrderId: string): Promise<PurchaseOrderItemEntity[]> {
    return this.repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .where('item.purchaseOrderId = :purchaseOrderId', { purchaseOrderId })
      .andWhere('item.receivedQuantity < item.orderedQuantity')
      .getMany();
  }
}
