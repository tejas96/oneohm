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

  async findById(id: string, manager?: EntityManager): Promise<WorkflowStepEntity | null> {
    return this.getRepo(manager).findOne({
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

  async findAllActive(manager?: EntityManager): Promise<WorkflowStepEntity[]> {
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
    manager?: EntityManager,
  ): Promise<WorkflowStepEntity | null> {
    const repo = this.getRepo(manager);
    await repo.update(
      {
        id,
        deletedAt: IsNull(),
      },
      data,
    );
    return this.findById(id, manager);
  }

  /**
   * Steps that list `code` among their dependencies. Dependency codes are a
   * text[] of spellings, not foreign keys, so nothing keeps them in step with a
   * renamed step -- callers have to rewrite them by hand.
   */
  async findByDependencyCode(code: string, manager?: EntityManager): Promise<WorkflowStepEntity[]> {
    const repo = this.getRepo(manager);
    return repo
      .createQueryBuilder('step')
      .where('step.deleted_at IS NULL')
      .andWhere(':code = ANY(step.depends_on_task_codes)', { code })
      .orderBy('step.sequenceOrder', 'ASC')
      .getMany();
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Another undeleted step already claiming this change-request type.
   *
   * Mirrors `idx_workflow_steps_org_change_request_type`, the partial unique index
   * from migration 1850700000000: one live row per type, whether or not it is
   * active. Checking only active rows would let the insert reach the database and
   * come back as a 500 instead of a readable message.
   */
  async existsChangeRequestType(
    changeRequestType: string,
    excludeId?: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const queryBuilder = this.getRepo(manager)
      .createQueryBuilder('step')
      .where('step.change_request_type = :changeRequestType', { changeRequestType })
      .andWhere('step.deleted_at IS NULL');

    if (excludeId) {
      queryBuilder.andWhere('step.id != :excludeId', { excludeId });
    }

    return (await queryBuilder.getCount()) > 0;
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
