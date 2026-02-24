import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, IsNull, type Repository } from 'typeorm';

import { WorkflowStepEntity } from '../entities/workflow-step.entity';

@Injectable()
export class WorkflowStepRepository {
  constructor(
    @InjectRepository(WorkflowStepEntity)
    public readonly repository: Repository<WorkflowStepEntity>,
  ) {}

  async create(data: Partial<WorkflowStepEntity>): Promise<WorkflowStepEntity> {
    const step = this.repository.create(data);
    return this.repository.save(step);
  }

  async findById(id: string, organizationId: string): Promise<WorkflowStepEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        organizationId,
        deletedAt: IsNull(),
      },
    });
  }

  async findAll(
    organizationId: string,
    page: number,
    limit: number,
    filters: {
      isActive?: boolean;
      type?: string;
      search?: string;
    } = {},
  ): Promise<{ data: WorkflowStepEntity[]; total: number }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.repository
      .createQueryBuilder('step')
      .where('step.organization_id = :organizationId', { organizationId })
      .andWhere('step.deleted_at IS NULL');

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('step.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters.type) {
      queryBuilder.andWhere('step.type = :type', { type: filters.type });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(step.name) LIKE LOWER(:search) OR LOWER(step.code) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    queryBuilder.orderBy('step.sequence_order', 'ASC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findAllActive(
    organizationId: string,
    manager?: EntityManager,
  ): Promise<WorkflowStepEntity[]> {
    const repo = this.getRepo(manager);
    return repo.find({
      where: {
        organizationId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        sequenceOrder: 'ASC',
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: Record<string, unknown>,
  ): Promise<WorkflowStepEntity | null> {
    await this.repository.update(
      {
        id,
        organizationId,
        deletedAt: IsNull(),
      },
      data,
    );
    return this.findById(id, organizationId);
  }

  async softDelete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
      organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  async existsByCode(code: string, organizationId: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('step')
      .where('step.organization_id = :organizationId', { organizationId })
      .andWhere('step.code = :code', { code })
      .andWhere('step.deleted_at IS NULL');

    if (excludeId) {
      queryBuilder.andWhere('step.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  private getRepo(manager?: EntityManager): Repository<WorkflowStepEntity> {
    return manager ? manager.getRepository(WorkflowStepEntity) : this.repository;
  }
}
