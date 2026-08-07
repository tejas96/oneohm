import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StockAllocationStatus } from '@tejas96/shared/types';
import { Repository } from 'typeorm';

import { StockAllocationEntity } from '../entities/stock-allocation.entity';

/**
 * Stock Allocation Repository
 * Handles database operations for stock allocations
 */
@Injectable()
export class StockAllocationRepository {
  constructor(
    @InjectRepository(StockAllocationEntity)
    private readonly repository: Repository<StockAllocationEntity>,
  ) {}

  /**
   * Create a new stock allocation
   */
  async create(allocationData: Partial<StockAllocationEntity>): Promise<StockAllocationEntity> {
    const allocation = this.repository.create(allocationData);
    return this.repository.save(allocation);
  }

  /**
   * Find allocation by ID
   */
  async findById(id: string): Promise<StockAllocationEntity> {
    const allocation = await this.repository.findOne({
      where: { id },
      relations: ['project', 'warehouse', 'product'],
    });

    if (!allocation) {
      throw new NotFoundException(`Stock Allocation with ID ${id} not found`);
    }

    return allocation;
  }

  /**
   * Find all allocations with filters and pagination
   */
  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      status?: StockAllocationStatus;
      /** When true, count rows whose status is not cancelled or completed (matches inventory KPI / Phase 9.3). Ignored if `status` is set. */
      activeOnly?: boolean;
      projectId?: string;
      warehouseId?: string;
      productId?: string;
    },
  ): Promise<{ allocations: StockAllocationEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.project', 'project')
      .leftJoinAndSelect('allocation.warehouse', 'warehouse')
      .leftJoinAndSelect('allocation.product', 'product');

    // Apply filters
    if (filters?.status) {
      query.andWhere('allocation.status = :status', { status: filters.status });
    } else if (filters?.activeOnly) {
      query.andWhere('allocation.status NOT IN (:...terminalStatuses)', {
        terminalStatuses: [StockAllocationStatus.CANCELLED, StockAllocationStatus.COMPLETED],
      });
    }

    if (filters?.projectId) {
      query.andWhere('allocation.projectId = :projectId', { projectId: filters.projectId });
    }

    if (filters?.warehouseId) {
      query.andWhere('allocation.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters?.productId) {
      query.andWhere('allocation.productId = :productId', { productId: filters.productId });
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by
    query.orderBy('allocation.allocatedAt', 'DESC');

    const [allocations, total] = await query.getManyAndCount();

    return { allocations, total };
  }

  /**
   * Find allocations by project
   */
  async findByProject(projectId: string): Promise<StockAllocationEntity[]> {
    return this.repository.find({
      where: { projectId },
      relations: ['warehouse', 'product'],
      order: { allocatedAt: 'DESC' },
    });
  }

  /**
   * Find active allocations by project
   */
  async findActiveByProject(projectId: string): Promise<StockAllocationEntity[]> {
    return this.repository.find({
      where: {
        projectId,
        status: StockAllocationStatus.ALLOCATED,
      },
      relations: ['warehouse', 'product'],
      order: { allocatedAt: 'DESC' },
    });
  }

  /**
   * Find allocations by warehouse and product
   */
  async findByWarehouseAndProduct(
    warehouseId: string,
    productId: string,
  ): Promise<StockAllocationEntity[]> {
    return this.repository.find({
      where: {
        warehouseId,
        productId,
        status: StockAllocationStatus.ALLOCATED,
      },
      relations: ['project'],
      order: { allocatedAt: 'ASC' },
    });
  }

  /**
   * Update allocation
   */
  async update(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<StockAllocationEntity> {
    const allocation = await this.findById(id);

    Object.assign(allocation, updateData);

    return this.repository.save(allocation);
  }

  /**
   * Delete allocation
   */
  async delete(id: string): Promise<void> {
    const allocation = await this.findById(id);
    await this.repository.remove(allocation);
  }

  /**
   * Get total allocated quantity for a product in a warehouse
   */
  async getTotalAllocatedQuantity(warehouseId: string, productId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('allocation')
      .select('SUM(allocation.allocatedQuantity)', 'totalAllocated')
      .where('allocation.warehouseId = :warehouseId', { warehouseId })
      .andWhere('allocation.productId = :productId', { productId })
      .andWhere('allocation.status = :status', { status: StockAllocationStatus.ALLOCATED })
      .getRawOne<{ totalAllocated: string }>();

    return result?.totalAllocated ? parseFloat(result.totalAllocated) : 0;
  }

  /**
   * Get total fulfilled quantity for a product in a warehouse
   */
  async getTotalFulfilledQuantity(warehouseId: string, productId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('allocation')
      .select('SUM(allocation.fulfilledQuantity)', 'totalFulfilled')
      .where('allocation.warehouseId = :warehouseId', { warehouseId })
      .andWhere('allocation.productId = :productId', { productId })
      .getRawOne<{ totalFulfilled: string }>();

    return result?.totalFulfilled ? parseFloat(result.totalFulfilled) : 0;
  }

  /**
   * Count allocations by status
   */
  async countByStatus(): Promise<Record<StockAllocationStatus, number>> {
    const result = await this.repository
      .createQueryBuilder('allocation')
      .select('allocation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('allocation.status')
      .getRawMany<{ status: StockAllocationStatus; count: string }>();

    const counts: Record<StockAllocationStatus, number> = {
      [StockAllocationStatus.ALLOCATED]: 0,
      [StockAllocationStatus.PARTIALLY_DISPATCHED]: 0,
      [StockAllocationStatus.DISPATCHED]: 0,
      [StockAllocationStatus.COMPLETED]: 0,
      [StockAllocationStatus.CANCELLED]: 0,
    };

    for (const row of result) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Get pending allocations (allocated but not fulfilled)
   */
  async getPendingAllocations(): Promise<StockAllocationEntity[]> {
    return this.repository.find({
      where: {
        status: StockAllocationStatus.ALLOCATED,
      },
      relations: ['project', 'warehouse', 'product'],
      order: { allocatedAt: 'ASC' },
    });
  }
}
