import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InstallationPricing } from '../entities/installation-pricing.entity';

@Injectable()
export class InstallationPricingRepository {
  constructor(
    @InjectRepository(InstallationPricing)
    private readonly repository: Repository<InstallationPricing>,
  ) {}

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
   * Find installation pricing for a specific system size.
   * System size is rounded UP to the nearest integer to match pricing tiers.
   */
  async findBySystemSize(
    organizationId: string,
    systemSizeKw: number,
    _projectType?: string,
    asOfDate?: Date,
  ): Promise<InstallationPricing | null> {
    const date = asOfDate || new Date();
    const dateStr: string = date.toISOString().split('T')[0] || '';
    const roundedSizeKw = Math.ceil(systemSizeKw);

    return this.repository
      .createQueryBuilder('pricing')
      .where('pricing.organization_id = :organizationId', { organizationId })
      .andWhere('pricing.is_active = true')
      .andWhere('pricing.min_system_size_kw <= :size', { size: roundedSizeKw })
      .andWhere('(pricing.max_system_size_kw IS NULL OR pricing.max_system_size_kw >= :size)', {
        size: roundedSizeKw,
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

  async findAll(
    organizationId: string,
    filters?: {
      isActive?: boolean;
      search?: string;
    },
  ): Promise<InstallationPricing[]> {
    const query = this.repository
      .createQueryBuilder('pricing')
      .where('pricing.organization_id = :organizationId', { organizationId });

    if (filters?.isActive !== undefined) {
      query.andWhere('pricing.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters?.search) {
      const parsed = Number(filters.search);
      if (!Number.isNaN(parsed)) {
        query
          .andWhere('pricing.min_system_size_kw <= :size', { size: parsed })
          .andWhere('(pricing.max_system_size_kw IS NULL OR pricing.max_system_size_kw >= :size)', {
            size: parsed,
          });
      } else {
        query.andWhere(
          '(CAST(pricing.min_system_size_kw AS TEXT) ILIKE :search OR CAST(pricing.max_system_size_kw AS TEXT) ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }
    }

    return query.orderBy('pricing.min_system_size_kw', 'ASC').getMany();
  }

  async findById(id: string, organizationId: string): Promise<InstallationPricing | null> {
    return this.repository.findOne({
      where: { id, organizationId },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<InstallationPricing>,
  ): Promise<InstallationPricing> {
    await this.repository.update({ id, organizationId }, data as any);
    const updated = await this.findById(id, organizationId);
    if (!updated) {
      throw new Error('Installation pricing not found after update');
    }
    return updated;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

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
