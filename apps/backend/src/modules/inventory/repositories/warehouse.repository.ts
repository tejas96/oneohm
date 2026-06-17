import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WarehouseStatus, WarehouseType } from '@tejas96/shared/types';
import { IsNull, Repository } from 'typeorm';

import { WarehouseEntity } from '../entities/warehouse.entity';

/**
 * Warehouse Repository
 * Handles database operations for warehouses
 */
@Injectable()
export class WarehouseRepository {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly repository: Repository<WarehouseEntity>,
  ) {}

  /**
   * Create a new warehouse
   */
  async create(warehouseData: Partial<WarehouseEntity>): Promise<WarehouseEntity> {
    const warehouse = this.repository.create(warehouseData);
    return this.repository.save(warehouse);
  }

  /**
   * Find warehouse by ID with relations
   */
  async findById(id: string, organizationId: string): Promise<WarehouseEntity> {
    const warehouse = await this.repository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ['organization', 'warehouseManager'],
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  /**
   * Find warehouse by code
   */
  async findByCode(code: string, organizationId: string): Promise<WarehouseEntity | null> {
    return this.repository.findOne({
      where: { code, organizationId, deletedAt: IsNull() },
    });
  }

  /**
   * Find all warehouses with filters and pagination
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: WarehouseStatus;
      warehouseType?: WarehouseType;
      warehouseManagerId?: string;
      search?: string;
    },
  ): Promise<{ warehouses: WarehouseEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('warehouse')
      .leftJoinAndSelect('warehouse.warehouseManager', 'manager')
      .where('warehouse.organizationId = :organizationId', { organizationId })
      .andWhere('warehouse.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('warehouse.status = :status', { status: filters.status });
    }

    if (filters?.warehouseType) {
      query.andWhere('warehouse.warehouseType = :warehouseType', {
        warehouseType: filters.warehouseType,
      });
    }

    if (filters?.warehouseManagerId) {
      query.andWhere('warehouse.warehouseManagerId = :warehouseManagerId', {
        warehouseManagerId: filters.warehouseManagerId,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(warehouse.name ILIKE :search OR warehouse.code ILIKE :search OR warehouse.city ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by
    query.orderBy('warehouse.createdAt', 'DESC');

    const [warehouses, total] = await query.getManyAndCount();

    return { warehouses, total };
  }

  /**
   * Update warehouse
   */
  async update(
    id: string,
    organizationId: string,
    updateData: Record<string, unknown>,
  ): Promise<WarehouseEntity> {
    const warehouse = await this.findById(id, organizationId);

    Object.assign(warehouse, updateData);

    return this.repository.save(warehouse);
  }

  /**
   * Soft delete warehouse
   */
  async softDelete(id: string, organizationId: string, deletedBy: string): Promise<void> {
    const warehouse = await this.findById(id, organizationId);

    warehouse.deletedAt = new Date();
    warehouse.updatedBy = deletedBy;

    await this.repository.save(warehouse);
  }

  /**
   * Count warehouses by status
   */
  async countByStatus(organizationId: string): Promise<Record<WarehouseStatus, number>> {
    const result = await this.repository
      .createQueryBuilder('warehouse')
      .select('warehouse.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('warehouse.organizationId = :organizationId', { organizationId })
      .andWhere('warehouse.deletedAt IS NULL')
      .groupBy('warehouse.status')
      .getRawMany<{ status: WarehouseStatus; count: string }>();

    const counts: Record<WarehouseStatus, number> = {
      [WarehouseStatus.ACTIVE]: 0,
      [WarehouseStatus.INACTIVE]: 0,
    };

    for (const row of result) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Find warehouses by type
   */
  async findByType(
    organizationId: string,
    warehouseType: WarehouseType,
  ): Promise<WarehouseEntity[]> {
    return this.repository.find({
      where: {
        organizationId,
        warehouseType,
        status: WarehouseStatus.ACTIVE,
        deletedAt: IsNull(),
      },
      order: { name: 'ASC' },
    });
  }
}
