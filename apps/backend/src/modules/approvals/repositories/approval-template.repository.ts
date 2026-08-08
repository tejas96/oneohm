import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApprovalWorkflowType } from '@tejas96/shared/types';
import { IsNull, Repository } from 'typeorm';

import { ApprovalTemplateEntity } from '../entities';

/**
 * ApprovalTemplateRepository
 * Handles data access for approval templates
 */
@Injectable()
export class ApprovalTemplateRepository {
  constructor(
    @InjectRepository(ApprovalTemplateEntity)
    private readonly repository: Repository<ApprovalTemplateEntity>,
  ) {}

  /**
   * Create a new approval template
   */
  async create(template: Partial<ApprovalTemplateEntity>): Promise<ApprovalTemplateEntity> {
    const newTemplate = this.repository.create(template);
    return this.repository.save(newTemplate);
  }

  /**
   * Find all templates for an organization
   */
  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      workflowType?: ApprovalWorkflowType;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<{ templates: ApprovalTemplateEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.stages', 'stage')
      .andWhere('template.deleted_at IS NULL')
      .orderBy('stage.stageOrder', 'ASC')
      .addOrderBy('template.createdAt', 'DESC');

    // Apply filters
    if (filters?.workflowType) {
      query.andWhere('template.workflow_type = :workflowType', {
        workflowType: filters.workflowType,
      });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('template.is_active = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(template.name ILIKE :search OR template.code ILIKE :search OR template.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [templates, total] = await query.getManyAndCount();

    return { templates, total };
  }

  /**
   * Find template by ID
   */
  async findById(id: string): Promise<ApprovalTemplateEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
      relations: ['stages'],
      order: {
        stages: {
          stageOrder: 'ASC',
        },
      },
    });
  }

  /**
   * Find template by code
   */
  async findByCode(code: string): Promise<ApprovalTemplateEntity | null> {
    return this.repository.findOne({
      where: {
        code,
        deletedAt: IsNull(),
      },
      relations: ['stages'],
      order: {
        stages: {
          stageOrder: 'ASC',
        },
      },
    });
  }

  /**
   * Find templates by workflow type
   */
  async findByWorkflowType(
    workflowType: ApprovalWorkflowType,
  ): Promise<ApprovalTemplateEntity[]> {
    return this.repository.find({
      where: {
        workflowType,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['stages'],
      order: {
        stages: {
          stageOrder: 'ASC',
        },
      },
    });
  }

  /**
   * Update template
   */
  async update(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<ApprovalTemplateEntity> {
    await this.repository.update(
      {
        id,
        deletedAt: IsNull(),
      },
      updateData,
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Template not found after update');
    }
    return updated;
  }

  /**
   * Soft delete template
   */
  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.repository.update(
      {
        id,
        deletedAt: IsNull(),
      },
      {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    );
  }

  /**
   * Get statistics by workflow type
   */
  async countByWorkflowType(): Promise<Record<ApprovalWorkflowType, number>> {
    const result = await this.repository
      .createQueryBuilder('template')
      .select('template.workflow_type', 'workflowType')
      .addSelect('COUNT(template.id)', 'count')
      .andWhere('template.deleted_at IS NULL')
      .groupBy('template.workflow_type')
      .getRawMany<{ workflowType: ApprovalWorkflowType; count: string }>();

    const stats: Record<string, number> = {};
    for (const type of Object.values(ApprovalWorkflowType)) {
      stats[type] = 0;
    }

    for (const row of result) {
      stats[row.workflowType] = parseInt(row.count, 10);
    }

    return stats as Record<ApprovalWorkflowType, number>;
  }

  /**
   * Get active templates count
   */
  async countActive(): Promise<number> {
    return this.repository.count({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
    });
  }
}
