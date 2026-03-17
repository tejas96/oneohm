import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateBrandDto, UpdateBrandDto } from '../dto';
import { BrandEntity } from '../entities/brand.entity';
import { BrandProductTypeRepository, BrandRepository } from '../repositories';

type BrandWithProductTypes = BrandEntity & { productTypeIds: string[] };

@Injectable()
export class BrandService {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly brandProductTypeRepository: BrandProductTypeRepository,
  ) {}

  async findAll(
    organizationId: string,
    filters?: { productTypeId?: string; isActive?: boolean; search?: string },
  ): Promise<BrandWithProductTypes[]> {
    const brands = await this.brandRepository.findAll(organizationId, filters);
    return this.attachProductTypes(brands);
  }

  async findById(id: string, organizationId: string): Promise<BrandWithProductTypes> {
    const brand = await this.brandRepository.findById(id, organizationId);
    if (!brand) throw new NotFoundException('Brand not found');
    const [withTypes] = await this.attachProductTypes([brand]);
    if (!withTypes) {
      throw new Error('Failed to load brand product types');
    }
    return withTypes;
  }

  async create(
    organizationId: string,
    data: CreateBrandDto,
    createdBy?: string,
  ): Promise<BrandWithProductTypes> {
    const existing = await this.brandRepository.findByName(data.name, organizationId);
    if (existing) throw new ConflictException(`Brand '${data.name}' already exists`);
    const { productTypeIds, ...brandData } = data;
    const brand = await this.brandRepository.create(organizationId, { ...brandData, createdBy });
    if (productTypeIds !== undefined) {
      await this.brandProductTypeRepository.replaceBrandProductTypes(brand.id, productTypeIds);
    }
    const [withTypes] = await this.attachProductTypes([brand]);
    if (!withTypes) {
      throw new Error('Failed to load brand product types');
    }
    return withTypes;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateBrandDto,
    updatedBy?: string,
  ): Promise<BrandWithProductTypes> {
    await this.findById(id, organizationId);
    const { productTypeIds, ...brandData } = data;
    const brand = await this.brandRepository.update(id, organizationId, {
      ...brandData,
      updatedBy,
    });
    if (productTypeIds !== undefined) {
      await this.brandProductTypeRepository.replaceBrandProductTypes(brand.id, productTypeIds);
    }
    const [withTypes] = await this.attachProductTypes([brand]);
    if (!withTypes) {
      throw new Error('Failed to load brand product types');
    }
    return withTypes;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.brandRepository.softDelete(id, organizationId);
  }

  private async attachProductTypes(brands: BrandEntity[]): Promise<BrandWithProductTypes[]> {
    if (brands.length === 0) {
      return [];
    }
    const mappings = await this.brandProductTypeRepository.findActiveByBrandIds(
      brands.map((brand) => brand.id),
    );
    const map = new Map<string, string[]>();
    mappings.forEach((mapping) => {
      const existing = map.get(mapping.brandId) ?? [];
      existing.push(mapping.productTypeId);
      map.set(mapping.brandId, existing);
    });

    return brands.map((brand) => ({
      ...brand,
      productTypeIds: map.get(brand.id) ?? [],
    }));
  }
}
