import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { InstallationPricing } from '../entities/installation-pricing.entity';

@Injectable()
export class InstallationPricingRepository {
  constructor(
    @InjectRepository(InstallationPricing)
    private readonly repository: Repository<InstallationPricing>,
  ) {}

  async create(
    data: Partial<InstallationPricing>,
  ): Promise<InstallationPricing> {
    const pricing = this.repository.create({
      ...data,
    });
    return this.repository.save(pricing);
  }

  /**
   * Find installation pricing for a specific system size.
   * System size is rounded UP to the nearest integer to match pricing tiers.
   */
  async findBySystemSize(
    systemSizeKw: number,
    _projectType?: string,
    asOfDate?: Date,
  ): Promise<InstallationPricing | null> {
    const date = asOfDate || new Date();
    const dateStr: string = date.toISOString().split('T')[0] || '';
    const roundedSizeKw = Math.ceil(systemSizeKw);

    const qb = this.repository
      .createQueryBuilder('pricing')
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
      .orderBy('pricing.min_system_size_kw', 'DESC');

    return qb.getOne();
  }

  async findAll(
    filters?: {
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: InstallationPricing[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('pricing');

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

    query.orderBy('pricing.min_system_size_kw', 'ASC');

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const [data, total] = await query.skip(offset).take(limit).getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<InstallationPricing | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async update(
    id: string,
    data: Partial<InstallationPricing>,
  ): Promise<InstallationPricing> {
    await this.repository.update({ id }, {
      ...data,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<InstallationPricing>);
    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException('Installation pricing not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async bulkCreate(
    pricingList: Partial<InstallationPricing>[],
  ): Promise<InstallationPricing[]> {
    const entities = pricingList.map((data) =>
      this.repository.create({
        ...data,
      }),
    );
    return this.repository.save(entities);
  }
}
