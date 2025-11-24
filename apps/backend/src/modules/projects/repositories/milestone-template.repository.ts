import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { MilestoneTemplateEntity } from '../entities/milestone-template.entity';

/**
 * MilestoneTemplateRepository
 * Data access layer for milestone templates
 */
@Injectable()
export class MilestoneTemplateRepository {
  constructor(
    @InjectRepository(MilestoneTemplateEntity)
    private readonly repository: Repository<MilestoneTemplateEntity>,
  ) {}

  /**
   * Create a new milestone template
   */
  async create(data: Partial<MilestoneTemplateEntity>): Promise<MilestoneTemplateEntity> {
    const template = this.repository.create(data);
    return this.repository.save(template);
  }

  /**
   * Find milestone template by ID
   */
  async findById(id: string, organizationId: string): Promise<MilestoneTemplateEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        organizationId,
        deletedAt: IsNull(),
      },
      relations: ['organization'],
    });
  }

  /**
   * Find milestone template by code
   */
  async findByCode(code: string, organizationId: string): Promise<MilestoneTemplateEntity | null> {
    return this.repository.findOne({
      where: {
        code,
        organizationId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all milestone templates with pagination and filters
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
  ): Promise<{ data: MilestoneTemplateEntity[]; total: number }> {
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
   * Find all active templates for an organization
   */
  async findAllActive(organizationId: string): Promise<MilestoneTemplateEntity[]> {
    return this.repository.find({
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

  /**
   * Find templates by type
   */
  async findByType(organizationId: string, type: string): Promise<MilestoneTemplateEntity[]> {
    return this.repository.find({
      where: {
        organizationId,
        type,
        deletedAt: IsNull(),
      },
      order: {
        sequenceOrder: 'ASC',
      },
    });
  }

  /**
   * Update a milestone template
   */
  async update(
    id: string,
    organizationId: string,
    data: Partial<MilestoneTemplateEntity>,
  ): Promise<MilestoneTemplateEntity | null> {
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
   * Soft delete a milestone template
   */
  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
      organizationId,
    });

    return (result.affected ?? 0) > 0;
  }

  /**
   * Check if code is unique within organization
   */
  async isCodeUnique(code: string, organizationId: string, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('template')
      .where('template.code = :code', { code })
      .andWhere('template.organization_id = :organizationId', { organizationId })
      .andWhere('template.deleted_at IS NULL');

    if (excludeId) {
      query.andWhere('template.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count === 0;
  }

  /**
   * Get count of templates by organization
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return this.repository.count({
      where: {
        organizationId,
        deletedAt: IsNull(),
      },
    });
  }
}
