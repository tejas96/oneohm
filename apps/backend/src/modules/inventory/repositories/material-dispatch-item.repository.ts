import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MaterialDispatchItemEntity } from '../entities/material-dispatch-item.entity';

/**
 * Material Dispatch Item Repository
 * Handles database operations for material dispatch items
 */
@Injectable()
export class MaterialDispatchItemRepository {
  constructor(
    @InjectRepository(MaterialDispatchItemEntity)
    private readonly repository: Repository<MaterialDispatchItemEntity>,
  ) {}

  /**
   * Create a new material dispatch item
   */
  async create(itemData: Partial<MaterialDispatchItemEntity>): Promise<MaterialDispatchItemEntity> {
    const item = this.repository.create(itemData);
    return this.repository.save(item);
  }

  /**
   * Create multiple material dispatch items
   */
  async createMany(itemsData: Partial<MaterialDispatchItemEntity>[]): Promise<MaterialDispatchItemEntity[]> {
    const items = this.repository.create(itemsData);
    return this.repository.save(items);
  }

  /**
   * Find material dispatch item by ID
   */
  async findById(id: string): Promise<MaterialDispatchItemEntity> {
    const item = await this.repository.findOne({
      where: { id },
      relations: ['dispatch', 'product'],
    });

    if (!item) {
      throw new NotFoundException(`Material Dispatch Item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Find all items for a material dispatch
   */
  async findByDispatch(dispatchId: string): Promise<MaterialDispatchItemEntity[]> {
    return this.repository.find({
      where: { dispatchId },
      relations: ['product'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Update material dispatch item
   */
  async update(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<MaterialDispatchItemEntity> {
    const item = await this.findById(id);

    Object.assign(item, updateData);

    return this.repository.save(item);
  }

  /**
   * Delete material dispatch item
   */
  async delete(id: string): Promise<void> {
    const item = await this.findById(id);
    await this.repository.remove(item);
  }

  /**
   * Delete all items for a material dispatch
   */
  async deleteByDispatch(dispatchId: string): Promise<void> {
    await this.repository.delete({ dispatchId });
  }

  /**
   * Get total dispatched quantity for a product
   */
  async getTotalDispatchedQuantity(productId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('item')
      .innerJoin('item.dispatch', 'dispatch')
      .select('SUM(item.quantity)', 'totalQuantity')
      .where('item.productId = :productId', { productId })
      .andWhere('dispatch.status IN (:...statuses)', {
        statuses: ['prepared', 'in_transit', 'delivered'],
      })
      .getRawOne<{ totalQuantity: string }>();

    return result?.totalQuantity ? parseFloat(result.totalQuantity) : 0;
  }

  /**
   * Get total dispatched quantity for a product by project
   */
  async getTotalDispatchedQuantityByProject(
    productId: string,
    projectId: string,
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('item')
      .innerJoin('item.dispatch', 'dispatch')
      .select('SUM(item.quantity)', 'totalQuantity')
      .where('item.productId = :productId', { productId })
      .andWhere('dispatch.projectId = :projectId', { projectId })
      .andWhere('dispatch.status IN (:...statuses)', {
        statuses: ['in_transit', 'delivered'],
      })
      .getRawOne<{ totalQuantity: string }>();

    return result?.totalQuantity ? parseFloat(result.totalQuantity) : 0;
  }

  /**
   * Find items by product
   */
  async findByProduct(productId: string): Promise<MaterialDispatchItemEntity[]> {
    return this.repository.find({
      where: { productId },
      relations: ['dispatch', 'dispatch.project'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}

