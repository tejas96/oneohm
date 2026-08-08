import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectType } from '@tejas96/shared/types';
import { Repository } from 'typeorm';

import { SubsidyConfiguration } from '../entities/subsidy-configuration.entity';

/**
 * Subsidy Configuration Repository
 * Handles database operations for subsidy configurations
 */
@Injectable()
export class SubsidyConfigurationRepository {
  constructor(
    @InjectRepository(SubsidyConfiguration)
    private readonly repository: Repository<SubsidyConfiguration>,
  ) {}

  /**
   * Create a new subsidy configuration
   */
  async create(data: Partial<SubsidyConfiguration>): Promise<SubsidyConfiguration> {
    const config = this.repository.create({
      ...data,
    });
    return this.repository.save(config);
  }

  /**
   * Find active subsidy configuration for a project type
   * This is the main method used by the quote calculator
   */
  async findActiveByProjectType(
    projectType: ProjectType,
    asOfDate?: Date,
  ): Promise<SubsidyConfiguration | null> {
    const date = asOfDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    return this.repository
      .createQueryBuilder('config')
      .andWhere('config.project_type = :projectType', { projectType })
      .andWhere('config.is_active = true')
      .andWhere('(config.effective_from IS NULL OR config.effective_from <= :date)', {
        date: dateStr,
      })
      .andWhere('(config.effective_to IS NULL OR config.effective_to >= :date)', { date: dateStr })
      .orderBy('config.createdAt', 'DESC')
      .getOne();
  }

  /**
   * Find ALL active subsidy configurations for a project type (supports multi-subsidy).
   */
  async findAllActiveByProjectType(
    projectType: ProjectType,
    asOfDate?: Date,
  ): Promise<SubsidyConfiguration[]> {
    const date = asOfDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    return this.repository
      .createQueryBuilder('config')
      .andWhere('config.project_type = :projectType', { projectType })
      .andWhere('config.is_active = true')
      .andWhere('(config.effective_from IS NULL OR config.effective_from <= :date)', {
        date: dateStr,
      })
      .andWhere('(config.effective_to IS NULL OR config.effective_to >= :date)', { date: dateStr })
      .orderBy('config.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find specific subsidy configurations by their IDs (used when user selects specific subsidies).
   * Only returns active, non-expired configurations.
   */
  async findByIds(ids: string[], asOfDate?: Date): Promise<SubsidyConfiguration[]> {
    if (ids.length === 0) return [];
    const date = asOfDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    return this.repository
      .createQueryBuilder('config')
      .andWhere('config.id IN (:...ids)', { ids })
      .andWhere('config.is_active = true')
      .andWhere('(config.effective_from IS NULL OR config.effective_from <= :date)', {
        date: dateStr,
      })
      .andWhere('(config.effective_to IS NULL OR config.effective_to >= :date)', {
        date: dateStr,
      })
      .getMany();
  }

  /**
   * Find all subsidy configurations for an organization
   */
  async findAll(filters?: {
    projectType?: ProjectType;
    isActive?: boolean;
    search?: string;
  }): Promise<SubsidyConfiguration[]> {
    const query = this.repository.createQueryBuilder('config');

    if (filters?.projectType) {
      query.andWhere('config.project_type = :projectType', {
        projectType: filters.projectType,
      });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('config.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters?.search) {
      query.andWhere('(config.scheme_name ILIKE :search OR config.scheme_code ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return query.orderBy('config.schemeName', 'ASC').getMany();
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<SubsidyConfiguration | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Update subsidy configuration
   */
  async update(id: string, data: Partial<SubsidyConfiguration>): Promise<SubsidyConfiguration> {
    await this.repository.update({ id }, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException('Subsidy configuration not found after update');
    }
    return updated;
  }

  /**
   * Deactivate other configs when setting one as active
   * Ensures only one active config per org + project type
   */
  async deactivateOthers(projectType: ProjectType, exceptId?: string): Promise<void> {
    const query = this.repository
      .createQueryBuilder()
      .update(SubsidyConfiguration)
      .set({ isActive: false })
      .andWhere('project_type = :projectType', { projectType });

    if (exceptId) {
      query.andWhere('id != :exceptId', { exceptId });
    }

    await query.execute();
  }

  /**
   * Soft-delete subsidy configuration (preserves audit trail for quote recalculation).
   */
  async delete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
