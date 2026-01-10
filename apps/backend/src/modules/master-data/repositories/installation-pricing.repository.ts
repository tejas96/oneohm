import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectType } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

import { InstallationPricing } from '../entities/installation-pricing.entity';

/**
 * Installation Pricing Repository
 * Handles database operations for installation pricing configurations
 */
@Injectable()
export class InstallationPricingRepository {
  constructor(
    @InjectRepository(InstallationPricing)
    private readonly repository: Repository<InstallationPricing>,
  ) {}

  /**
   * Create a new installation pricing configuration
   */
  async create(
    organizationId: string,
    data: Partial<InstallationPricing>,
  ): Promise<InstallationPricing> {
    const pricing = this.repository.create({
      ...data,
      organizationId,
    });
    return this.repository.save(pricing);
  }

  /**
   * Find installation pricing for a specific system size
   * This is the main method used by the quote calculator
   *
   * Fallback Logic:
   * - First tries to find pricing for the exact project type
   * - If not found, falls back to 'residential' pricing (same for all project types)
   */
  async findBySystemSize(
    organizationId: string,
    systemSizeKw: number,
    projectType: ProjectType,
    asOfDate?: Date,
  ): Promise<InstallationPricing | null> {
    const date = asOfDate || new Date();
    const dateStr: string = date.toISOString().split('T')[0] || '';

    // Try exact project type match first
    let pricing = await this.findBySystemSizeAndProjectType(
      organizationId,
      systemSizeKw,
      projectType,
      dateStr,
    );

    // Fallback to residential if not found (installation pricing is same for all project types)
    if (!pricing && projectType !== ProjectType.RESIDENTIAL) {
      pricing = await this.findBySystemSizeAndProjectType(
        organizationId,
        systemSizeKw,
        ProjectType.RESIDENTIAL,
        dateStr,
      );
    }

    return pricing;
  }

  /**
   * Internal helper to find pricing by system size and project type
   */
  private async findBySystemSizeAndProjectType(
    organizationId: string,
    systemSizeKw: number,
    projectType: ProjectType,
    dateStr: string,
  ): Promise<InstallationPricing | null> {
    return this.repository
      .createQueryBuilder('pricing')
      .where('pricing.organization_id = :organizationId', { organizationId })
      .andWhere('pricing.project_type = :projectType', { projectType })
      .andWhere('pricing.is_active = true')
      .andWhere('pricing.min_system_size_kw <= :size', { size: systemSizeKw })
      .andWhere('(pricing.max_system_size_kw IS NULL OR pricing.max_system_size_kw >= :size)', {
        size: systemSizeKw,
      })
      .andWhere('(pricing.effective_from IS NULL OR pricing.effective_from <= :date)', {
        date: dateStr,
      })
      .andWhere('(pricing.effective_to IS NULL OR pricing.effective_to >= :date)', {
        date: dateStr,
      })
      .orderBy('pricing.min_system_size_kw', 'DESC')
      .getOne();
  }

  /**
   * Find all installation pricing configurations for an organization
   */
  async findAll(
    organizationId: string,
    filters?: {
      projectType?: ProjectType;
      isActive?: boolean;
    },
  ): Promise<InstallationPricing[]> {
    const query = this.repository
      .createQueryBuilder('pricing')
      .where('pricing.organization_id = :organizationId', { organizationId });

    if (filters?.projectType) {
      query.andWhere('pricing.project_type = :projectType', {
        projectType: filters.projectType,
      });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('pricing.is_active = :isActive', { isActive: filters.isActive });
    }

    return query.orderBy('pricing.min_system_size_kw', 'ASC').getMany();
  }

  /**
   * Find by ID
   */
  async findById(id: string, organizationId: string): Promise<InstallationPricing | null> {
    return this.repository.findOne({
      where: { id, organizationId },
    });
  }

  /**
   * Update installation pricing
   */
  async update(
    id: string,
    organizationId: string,
    data: Partial<InstallationPricing>,
  ): Promise<InstallationPricing> {
    await this.repository.update({ id, organizationId }, data);
    const updated = await this.findById(id, organizationId);
    if (!updated) {
      throw new Error('Installation pricing not found after update');
    }
    return updated;
  }

  /**
   * Delete installation pricing
   */
  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

  /**
   * Bulk create installation pricing (for initial setup)
   */
  async bulkCreate(
    organizationId: string,
    pricingList: Partial<InstallationPricing>[],
  ): Promise<InstallationPricing[]> {
    const entities = pricingList.map((data) =>
      this.repository.create({
        ...data,
        organizationId,
      }),
    );
    return this.repository.save(entities);
  }
}
