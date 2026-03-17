import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { BrandEntity } from '../entities/brand.entity';

@Injectable()
export class BrandRepository {
  constructor(
    @InjectRepository(BrandEntity)
    private readonly repository: Repository<BrandEntity>,
  ) {}

  async findAll(
    organizationId: string,
    filters?: { productTypeId?: string; isActive?: boolean; search?: string },
  ): Promise<BrandEntity[]> {
    const query = this.repository
      .createQueryBuilder('brand')
      .where('brand.organization_id = :organizationId', { organizationId })
      .andWhere('brand.deleted_at IS NULL');

    if (filters?.isActive !== undefined) {
      query.andWhere('brand.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters?.search) {
      query.andWhere(
        '(brand.name ILIKE :search OR brand.manufacturer_name ILIKE :search OR brand.website ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.productTypeId) {
      query
        .innerJoin('brand_product_types', 'bpt', 'bpt.brand_id = brand.id')
        .andWhere('bpt.product_type_id = :productTypeId', {
          productTypeId: filters.productTypeId,
        })
        .andWhere('bpt.is_active = true');
    }

    return query.orderBy('brand.name', 'ASC').getMany();
  }

  async findById(id: string, organizationId: string): Promise<BrandEntity | null> {
    return this.repository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
  }

  async findByName(name: string, organizationId: string): Promise<BrandEntity | null> {
    return this.repository
      .createQueryBuilder('brand')
      .where('brand.organization_id = :organizationId', { organizationId })
      .andWhere('LOWER(brand.name) = LOWER(:name)', { name })
      .andWhere('brand.deleted_at IS NULL')
      .getOne();
  }

  async create(organizationId: string, data: Partial<BrandEntity>): Promise<BrandEntity> {
    const entity = this.repository.create({ ...data, organizationId });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<BrandEntity>,
  ): Promise<BrandEntity> {
    await this.repository.update({ id, organizationId }, {
      ...data,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<BrandEntity>);
    const updated = await this.findById(id, organizationId);
    if (!updated) throw new Error('Brand not found after update');
    return updated;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repository.update({ id, organizationId }, {
      deletedAt: new Date(),
    } as QueryDeepPartialEntity<BrandEntity>);
  }
}
