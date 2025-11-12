import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { TaskTemplateEntity } from '../entities/task-template.entity';

/**
 * TaskTemplateRepository
 * Data access layer for task templates
 */
@Injectable()
export class TaskTemplateRepository {
  constructor(
    @InjectRepository(TaskTemplateEntity)
    private readonly repository: Repository<TaskTemplateEntity>,
  ) {}

  /**
   * Create a new task template
   */
  async create(data: Partial<TaskTemplateEntity>): Promise<TaskTemplateEntity> {
    const template = this.repository.create(data);
    return this.repository.save(template);
  }

  /**
   * Find task template by ID
   */
  async findById(id: string, organizationId: string): Promise<TaskTemplateEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        organizationId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all task templates with pagination and filters
   */
  async findAll(
    organizationId: string,
    page: number,
    limit: number,
    filters: {
      isActive?: boolean;
      type?: string;
      search?: string;
    } = {},
  ): Promise<{ data: TaskTemplateEntity[]; total: number }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.repository
      .createQueryBuilder('template')
      .where('template.organization_id = :organizationId', { organizationId })
      .andWhere('template.deleted_at IS NULL');

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('template.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters.type) {
      queryBuilder.andWhere('template.type = :type', { type: filters.type });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(template.name) LIKE LOWER(:search) OR LOWER(template.code) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    queryBuilder.orderBy('template.sequence_order', 'ASC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  /**
   * Find templates by milestone template ID
   */
  async findByMilestoneTemplate(milestoneTemplateId: string): Promise<TaskTemplateEntity[]> {
    return this.repository.find({
      where: {
        milestoneTemplateId,
        deletedAt: IsNull(),
      },
      order: {
        sequenceOrder: 'ASC',
      },
    });
  }

  /**
   * Update task template
   */
  async update(
    id: string,
    organizationId: string,
    data: Record<string, unknown>,
  ): Promise<TaskTemplateEntity | null> {
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

  /**
   * Soft delete task template
   */
  async softDelete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
      organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Check if code exists for organization
   */
  async existsByCode(code: string, organizationId: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('template')
      .where('template.organization_id = :organizationId', { organizationId })
      .andWhere('template.code = :code', { code })
      .andWhere('template.deleted_at IS NULL');

    if (excludeId) {
      queryBuilder.andWhere('template.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }
}

