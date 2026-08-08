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

  async findById(id: string): Promise<WorkflowStepEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });
  }

  async findAll(
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

    queryBuilder.orderBy('step.sequenceOrder', 'ASC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findAllActive(
    manager?: EntityManager,
  ): Promise<WorkflowStepEntity[]> {
    const repo = this.getRepo(manager);
    return repo.find({
      where: {
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
    data: Record<string, unknown>,
  ): Promise<WorkflowStepEntity | null> {
    await this.repository.update(
      {
        id,
        deletedAt: IsNull(),
      },
      data,
    );
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
    });
    return (result.affected ?? 0) > 0;
  }

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('step')
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
