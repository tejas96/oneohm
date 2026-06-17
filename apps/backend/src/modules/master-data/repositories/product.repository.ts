import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductStatus } from '@tejas96/shared/types';
import { In, IsNull, Repository, SelectQueryBuilder, type FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { ProductEntity } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repository: Repository<ProductEntity>,
  ) {}

  async create(
    organizationId: string,
    productData: Partial<ProductEntity>,
  ): Promise<ProductEntity> {
    const product = this.repository.create({
      ...productData,
      organizationId,
    });
    return this.repository.save(product);
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: ProductStatus;
      productTypeId?: string;
      brandId?: string;
      brand?: string;
      search?: string;
    },
  ): Promise<{ data: ProductEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.productType', 'productType')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.deleted_at IS NULL')
      .andWhere('(brand.id IS NULL OR brand.is_active = true)');

    if (filters?.status) {
      query.andWhere('product.status = :status', { status: filters.status });
    }

    if (filters?.productTypeId) {
      query.andWhere('product.product_type_id = :productTypeId', {
        productTypeId: filters.productTypeId,
      });
    }

    if (filters?.brandId) {
      query.andWhere('product.brand_id = :brandId', { brandId: filters.brandId });
    }

    if (filters?.brand) {
      query.andWhere('LOWER(brand.name) LIKE LOWER(:brandName)', {
        brandName: `%${filters.brand}%`,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(product.name ILIKE :search OR product.code ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Split getCount + getMany to avoid TypeORM getManyAndCount crash
    // when leftJoinAndSelect is combined with orderBy on a joined alias.
    const total = await query.getCount();
    const data = await query
      .orderBy('product.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findById(
    id: string,
    organizationId: string,
    options?: { requireActive?: boolean },
  ): Promise<ProductEntity | null> {
    const where: FindOptionsWhere<ProductEntity> = {
      id,
      organizationId,
      deletedAt: IsNull(),
    };
    if (options?.requireActive === true) {
      where.status = ProductStatus.ACTIVE;
    }
    return this.repository.findOne({
      where,
      relations: ['productType', 'brand'],
    });
  }

  async findAnyById(id: string, organizationId: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        organizationId,
      },
      relations: ['productType', 'brand'],
    });
  }

  /**
   * Batch load products by ids in a single query. Includes soft-deleted rows
   * so the caller can decide what to do (e.g. PricingService needs to be
   * able to look up products that may have been deactivated). Returns a Map
   * keyed by productId for O(1) lookup; missing ids are absent from the map.
   */
  async findManyByIds(ids: string[], organizationId: string): Promise<Map<string, ProductEntity>> {
    const map = new Map<string, ProductEntity>();
    if (ids.length === 0) return map;
    const rows = await this.repository.find({
      where: { id: In(ids), organizationId },
      relations: ['productType', 'brand'],
    });
    for (const row of rows) map.set(row.id, row);
    return map;
  }

  async findByCode(code: string, organizationId: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: {
        code,
        organizationId,
        deletedAt: IsNull(),
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    productData: Partial<ProductEntity>,
  ): Promise<ProductEntity> {
    await this.repository.update({ id, organizationId }, {
      ...productData,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<ProductEntity>);

    const updated = await this.findById(id, organizationId);
    if (!updated) {
      throw new NotFoundException('Product not found after update');
    }
    return updated;
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: ProductStatus,
    updatedBy?: string,
  ): Promise<ProductEntity> {
    await this.repository.update(
      { id, organizationId },
      {
        status,
        updatedBy,
        updatedAt: new Date(),
      },
    );

    const updated = await this.findById(id, organizationId);
    if (!updated) {
      throw new NotFoundException('Product not found after status update');
    }
    return updated;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repository.update(
      { id, organizationId },
      {
        deletedAt: new Date(),
      },
    );
  }

  // ==================== Quote Calculator Methods ====================

  async findSolarPanel(
    organizationId: string,
    isDcr: boolean,
    productTypeId: string,
    preferredBrand?: string,
    preferredTechnology?: string,
    preferredWattage?: number,
  ): Promise<ProductEntity | null> {
    const query = this.addMinActiveUnitPriceJoin(
      this.repository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.brand', 'brand')
        .where('product.organization_id = :organizationId', { organizationId })
        .andWhere('product.product_type_id = :productTypeId', { productTypeId })
        .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('product.deleted_at IS NULL')
        .andWhere("product.specifications->>'is_dcr' = :isDcr", {
          isDcr: isDcr.toString(),
        })
        .andWhere('(brand.id IS NULL OR brand.is_active = true)'),
    );

    if (preferredBrand) {
      query.andWhere('LOWER(brand.name) = LOWER(:brand)', { brand: preferredBrand });
    }

    if (preferredTechnology) {
      query.andWhere("LOWER(product.specifications->>'technology') = LOWER(:technology)", {
        technology: preferredTechnology,
      });
    }

    if (preferredWattage) {
      query.andWhere("(product.specifications->>'min_wattage')::int = :preferredWattage", {
        preferredWattage,
      });
    }

    query
      .orderBy("(product.specifications->>'wattage')::int", 'DESC')
      .addOrderBy('price.unit_price', 'ASC', 'NULLS LAST');

    return query.getOne();
  }

  async findAllSolarPanels(
    organizationId: string,
    isDcr: boolean,
    productTypeId: string,
    preferredBrand?: string,
    preferredTechnology?: string,
    minWattage?: number,
  ): Promise<ProductEntity[]> {
    const query = this.addMinActiveUnitPriceJoin(
      this.repository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.brand', 'brand')
        .where('product.organization_id = :organizationId', { organizationId })
        .andWhere('product.product_type_id = :productTypeId', { productTypeId })
        .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('product.deleted_at IS NULL')
        .andWhere("product.specifications->>'is_dcr' = :isDcr", {
          isDcr: isDcr.toString(),
        })
        .andWhere('(brand.id IS NULL OR brand.is_active = true)'),
    );

    if (preferredBrand) {
      query.andWhere('LOWER(brand.name) = LOWER(:brand)', { brand: preferredBrand });
    }

    if (preferredTechnology) {
      query.andWhere("LOWER(product.specifications->>'technology') = LOWER(:technology)", {
        technology: preferredTechnology,
      });
    }

    if (minWattage) {
      query.andWhere("(product.specifications->>'wattage')::int >= :minWattage", {
        minWattage: Math.ceil(minWattage),
      });
    }

    query
      .orderBy("(product.specifications->>'wattage')::int", 'ASC')
      .addOrderBy('price.unit_price', 'ASC', 'NULLS LAST');

    return query.getMany();
  }

  async findInvertersByPhase(
    organizationId: string,
    phaseType: string,
    productTypeId: string,
    preferredBrand?: string,
    preferredCapacityKw?: number,
  ): Promise<ProductEntity[]> {
    const query = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.product_type_id = :productTypeId', { productTypeId })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.deleted_at IS NULL')
      .andWhere("product.specifications->>'phase_type' = :phaseType", { phaseType })
      .andWhere('(brand.id IS NULL OR brand.is_active = true)');

    if (preferredBrand) {
      query.andWhere('LOWER(brand.name) = LOWER(:brand)', { brand: preferredBrand });
    }

    if (preferredCapacityKw !== undefined) {
      query.andWhere("(product.specifications->>'capacity_kw')::float = :capacityKw", {
        capacityKw: preferredCapacityKw,
      });
    }

    query.orderBy("(product.specifications->>'capacity_kw')::float", 'DESC');

    return query.getMany();
  }

  async findMountingStructure(
    organizationId: string,
    productTypeId: string,
    structureType?: string,
  ): Promise<ProductEntity | null> {
    const query = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.product_type_id = :productTypeId', { productTypeId })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.deleted_at IS NULL')
      .andWhere('(brand.id IS NULL OR brand.is_active = true)');

    if (structureType) {
      query.andWhere("product.specifications->>'structure_type' = :structureType", {
        structureType,
      });
    }

    query.orderBy('product.name', 'ASC');

    return query.getOne();
  }

  async findByType(
    organizationId: string,
    productTypeId: string,
    activeOnly = true,
  ): Promise<ProductEntity[]> {
    const where: FindOptionsWhere<ProductEntity> = {
      organizationId,
      productTypeId,
      deletedAt: IsNull(),
    };

    if (activeOnly) {
      where.status = ProductStatus.ACTIVE;
    }

    return this.repository.find({
      where,
      relations: ['brand'],
      order: { name: 'ASC' },
    });
  }

  private addMinActiveUnitPriceJoin(
    qb: SelectQueryBuilder<ProductEntity>,
  ): SelectQueryBuilder<ProductEntity> {
    return qb.leftJoin(
      `(
        SELECT product_id, MIN(unit_price::numeric) AS unit_price
        FROM product_prices
        WHERE organization_id = :organizationId
          AND is_active = true
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        GROUP BY product_id
      )`,
      'price',
      'price.product_id = product.id',
    );
  }
}
