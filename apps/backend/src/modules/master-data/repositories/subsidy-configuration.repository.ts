import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectType } from '@oneohm-epc/shared/types';
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
  async create(
    organizationId: string,
    data: Partial<SubsidyConfiguration>,
  ): Promise<SubsidyConfiguration> {
    const config = this.repository.create({
      ...data,
      organizationId,
    });
    return this.repository.save(config);
  }

  /**
   * Find active subsidy configuration for a project type
   * This is the main method used by the quote calculator
   */
  async findActiveByProjectType(
    organizationId: string,
    projectType: ProjectType,
    asOfDate?: Date,
  ): Promise<SubsidyConfiguration | null> {
    const date = asOfDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    return this.repository
      .createQueryBuilder('config')
      .where('config.organization_id = :organizationId', { organizationId })
      .andWhere('config.project_type = :projectType', { projectType })
      .andWhere('config.is_active = true')
      .andWhere('(config.effective_from IS NULL OR config.effective_from <= :date)', {
        date: dateStr,
      })
      .andWhere('(config.effective_to IS NULL OR config.effective_to >= :date)', { date: dateStr })
      .orderBy('config.created_at', 'DESC')
      .getOne();
  }

  /**
   * Find all subsidy configurations for an organization
   */
  async findAll(
    organizationId: string,
    filters?: {
      projectType?: ProjectType;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<SubsidyConfiguration[]> {
    const query = this.repository
      .createQueryBuilder('config')
      .where('config.organization_id = :organizationId', { organizationId });

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

    return query.orderBy('config.scheme_name', 'ASC').getMany();
  }

  /**
   * Find by ID
   */
  async findById(id: string, organizationId: string): Promise<SubsidyConfiguration | null> {
    return this.repository.findOne({
      where: { id, organizationId },
    });
  }

  /**
   * Update subsidy configuration
   */
  async update(
    id: string,
    organizationId: string,
    data: Partial<SubsidyConfiguration>,
  ): Promise<SubsidyConfiguration> {
    await this.repository.update({ id, organizationId }, data);
    const updated = await this.findById(id, organizationId);
    if (!updated) {
      throw new Error('Subsidy configuration not found after update');
    }
    return updated;
  }

  /**
   * Deactivate other configs when setting one as active
   * Ensures only one active config per org + project type
   */
  async deactivateOthers(
    organizationId: string,
    projectType: ProjectType,
    exceptId?: string,
  ): Promise<void> {
    const query = this.repository
      .createQueryBuilder()
      .update(SubsidyConfiguration)
      .set({ isActive: false })
      .where('organization_id = :organizationId', { organizationId })
      .andWhere('project_type = :projectType', { projectType });

    if (exceptId) {
      query.andWhere('id != :exceptId', { exceptId });
    }

    await query.execute();
  }

  /**
   * Delete subsidy configuration
   */
  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }
}
