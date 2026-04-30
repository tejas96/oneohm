import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MaterialDispatchStatus } from '@oneohm-epc/shared/types';
import { EntityManager, Repository } from 'typeorm';

import { MaterialDispatchEntity } from '../entities/material-dispatch.entity';

/**
 * Material Dispatch Repository
 * Handles database operations for material dispatches
 */
@Injectable()
export class MaterialDispatchRepository {
  constructor(
    @InjectRepository(MaterialDispatchEntity)
    private readonly repository: Repository<MaterialDispatchEntity>,
  ) {}

  /**
   * Create a new material dispatch
   */
  async create(dispatchData: Partial<MaterialDispatchEntity>): Promise<MaterialDispatchEntity> {
    const dispatch = this.repository.create(dispatchData);
    return this.repository.save(dispatch);
  }

  /**
   * Find dispatch by ID with relations
   */
  async findById(id: string, organizationId: string): Promise<MaterialDispatchEntity> {
    const dispatch = await this.repository.findOne({
      where: { id, organizationId },
      relations: ['project', 'warehouse', 'items', 'items.product', 'creator', 'updater'],
    });

    if (!dispatch) {
      throw new NotFoundException(`Material Dispatch with ID ${id} not found`);
    }

    return dispatch;
  }

  /**
   * Find dispatch by dispatch number
   */
  async findByDispatchNumber(
    dispatchNumber: string,
    organizationId: string,
  ): Promise<MaterialDispatchEntity | null> {
    return this.repository.findOne({
      where: { dispatchNumber, organizationId },
      relations: ['project', 'warehouse', 'items'],
    });
  }

  /**
   * Find all dispatches with filters and pagination
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: MaterialDispatchStatus;
      projectId?: string;
      warehouseId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ dispatches: MaterialDispatchEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('dispatch')
      .leftJoinAndSelect('dispatch.project', 'project')
      .leftJoinAndSelect('dispatch.warehouse', 'warehouse')
      .where('dispatch.organizationId = :organizationId', { organizationId });

    // Apply filters
    if (filters?.status) {
      query.andWhere('dispatch.status = :status', { status: filters.status });
    }

    if (filters?.projectId) {
      query.andWhere('dispatch.projectId = :projectId', { projectId: filters.projectId });
    }

    if (filters?.warehouseId) {
      query.andWhere('dispatch.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters?.fromDate) {
      query.andWhere('dispatch.dispatchDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('dispatch.dispatchDate <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.search) {
      query.andWhere(
        '(dispatch.dispatchNumber ILIKE :search OR project.projectNumber ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by
    query.orderBy('dispatch.dispatchDate', 'DESC').addOrderBy('dispatch.createdAt', 'DESC');

    const [dispatches, total] = await query.getManyAndCount();

    return { dispatches, total };
  }

  /**
   * Find dispatches by project
   */
  async findByProject(
    projectId: string,
    organizationId: string,
  ): Promise<MaterialDispatchEntity[]> {
    return this.repository.find({
      where: { projectId, organizationId },
      relations: ['warehouse', 'items', 'items.product'],
      order: { dispatchDate: 'DESC' },
    });
  }

  /**
   * Find dispatches by warehouse
   */
  async findByWarehouse(
    warehouseId: string,
    page = 1,
    limit = 20,
  ): Promise<{ dispatches: MaterialDispatchEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('dispatch')
      .leftJoinAndSelect('dispatch.project', 'project')
      .where('dispatch.warehouseId = :warehouseId', { warehouseId })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('dispatch.dispatchDate', 'DESC');

    const [dispatches, total] = await query.getManyAndCount();

    return { dispatches, total };
  }

  /**
   * Update dispatch
   */
  async update(
    id: string,
    organizationId: string,
    updateData: Record<string, unknown>,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.findById(id, organizationId);

    Object.assign(dispatch, updateData);

    return this.repository.save(dispatch);
  }

  /**
   * Delete dispatch
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const dispatch = await this.findById(id, organizationId);
    await this.repository.remove(dispatch);
  }

  /**
   * Count dispatches by status
   */
  async countByStatus(organizationId: string): Promise<Record<MaterialDispatchStatus, number>> {
    const result = await this.repository
      .createQueryBuilder('dispatch')
      .select('dispatch.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('dispatch.organizationId = :organizationId', { organizationId })
      .groupBy('dispatch.status')
      .getRawMany<{ status: MaterialDispatchStatus; count: string }>();

    const counts: Record<MaterialDispatchStatus, number> = {
      [MaterialDispatchStatus.PREPARED]: 0,
      [MaterialDispatchStatus.DISPATCHED]: 0,
      [MaterialDispatchStatus.IN_TRANSIT]: 0,
      [MaterialDispatchStatus.DELIVERED]: 0,
      [MaterialDispatchStatus.PARTIALLY_DELIVERED]: 0,
      [MaterialDispatchStatus.CANCELLED]: 0,
    };

    for (const row of result) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Get in-transit dispatches
   */
  async getInTransitDispatches(organizationId: string): Promise<MaterialDispatchEntity[]> {
    return this.repository.find({
      where: {
        organizationId,
        status: MaterialDispatchStatus.IN_TRANSIT,
      },
      relations: ['project', 'warehouse'],
      order: { dispatchDate: 'ASC' },
    });
  }

  /**
   * Get pending dispatches (draft or prepared)
   */
  async getPendingDispatches(organizationId: string): Promise<MaterialDispatchEntity[]> {
    return this.repository
      .createQueryBuilder('dispatch')
      .leftJoinAndSelect('dispatch.project', 'project')
      .leftJoinAndSelect('dispatch.warehouse', 'warehouse')
      .where('dispatch.organizationId = :organizationId', { organizationId })
      .andWhere('dispatch.status IN (:...statuses)', {
        statuses: [MaterialDispatchStatus.PREPARED],
      })
      .orderBy('dispatch.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Generate next dispatch number (concurrency-safe via numbering_sequences)
   */
  async generateDispatchNumber(organizationId: string, manager?: EntityManager): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequenceKey = `dispatch-${year}-${month}`;
    const yyyymm = `${year}${month}`;

    const exec = manager ?? this.repository.manager;
    const result = await exec.query(
      `INSERT INTO numbering_sequences (organization_id, sequence_key, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (organization_id, sequence_key)
       DO UPDATE SET last_value = numbering_sequences.last_value + 1
       RETURNING last_value`,
      [organizationId, sequenceKey],
    );

    const raw = result[0]?.last_value;
    const seq = typeof raw === 'string' ? parseInt(raw, 10) : (raw ?? 1);
    return `MD-${yyyymm}-${String(seq).padStart(4, '0')}`;
  }
}
