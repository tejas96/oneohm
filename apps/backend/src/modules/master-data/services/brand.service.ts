import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateBrandDto, UpdateBrandDto } from '../dto';
import { BrandEntity } from '../entities/brand.entity';
import { BrandProductTypeRepository, BrandRepository } from '../repositories';

type BrandWithProductTypes = BrandEntity & { productTypeIds: string[] };

export interface PaginatedBrands {
  data: BrandWithProductTypes[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class BrandService {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly brandProductTypeRepository: BrandProductTypeRepository,
  ) {}

  async findAll(
    filters?: {
      productTypeId?: string;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<PaginatedBrands> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const { data, total } = await this.brandRepository.findAll(filters);
    const withTypes = await this.attachProductTypes(data);
    return {
      data: withTypes,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findById(id: string): Promise<BrandWithProductTypes> {
    const brand = await this.brandRepository.findById(id);
    if (!brand) throw new NotFoundException('Brand not found');
    const [withTypes] = await this.attachProductTypes([brand]);
    if (!withTypes) {
      throw new Error('Failed to load brand product types');
    }
    return withTypes;
  }

  async create(
    data: CreateBrandDto,
    createdBy?: string,
  ): Promise<BrandWithProductTypes> {
    const existing = await this.brandRepository.findByName(data.name);
    if (existing) throw new ConflictException(`Brand '${data.name}' already exists`);
    const { productTypeIds, ...brandData } = data;
    const brand = await this.brandRepository.create({ ...brandData, createdBy });
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
    data: UpdateBrandDto,
    updatedBy?: string,
  ): Promise<BrandWithProductTypes> {
    await this.findById(id);
    const { productTypeIds, ...brandData } = data;
    const brand = await this.brandRepository.update(id, {
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

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.brandRepository.softDelete(id);
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
