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

  async create(productData: Partial<ProductEntity>): Promise<ProductEntity> {
    const product = this.repository.create({
      ...productData,
    });
    return this.repository.save(product);
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      status?: ProductStatus;
      productTypeId?: string;
      brandId?: string;
      brand?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      hasActivePrice?: boolean;
    },
  ): Promise<{ data: ProductEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.productType', 'productType')
      .leftJoinAndSelect('product.brand', 'brand')
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

    if (filters?.hasActivePrice) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM product_prices pp
          WHERE pp.product_id = product.id
            AND pp.is_active = true
            AND pp.effective_from <= CURRENT_DATE
            AND (pp.effective_to IS NULL OR pp.effective_to >= CURRENT_DATE)
        )`,
      );
    }

    // Split getCount + getMany to avoid TypeORM getManyAndCount crash
    // when leftJoinAndSelect is combined with orderBy on a joined alias.
    const allowedSortFields: Record<string, string> = {
      name: 'product.name',
      code: 'product.code',
      createdAt: 'product.createdAt',
      updatedAt: 'product.updatedAt',
      status: 'product.status',
    };
    const appliedOrderBy =
      (filters?.sortBy && allowedSortFields[filters.sortBy]) ?? 'product.createdAt';
    const appliedOrder = filters?.sortOrder ?? 'DESC';
    const total = await query.getCount();
    const dataQuery = query.orderBy(appliedOrderBy, appliedOrder);
    // Avoid a second ORDER BY on the same column — TypeORM/SQL treats it as a
    // tiebreaker and can force ASC, making name DESC appear identical to ASC.
    if (appliedOrderBy !== 'product.name') {
      dataQuery.addOrderBy('product.name', 'ASC');
    } else {
      dataQuery.addOrderBy('product.id', 'ASC');
    }
    const data = await dataQuery
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findById(id: string, options?: { requireActive?: boolean }): Promise<ProductEntity | null> {
    const where: FindOptionsWhere<ProductEntity> = {
      id,
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

  async findAnyById(id: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: {
        id,
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
  async findManyByIds(ids: string[]): Promise<Map<string, ProductEntity>> {
    const map = new Map<string, ProductEntity>();
    if (ids.length === 0) return map;
    const rows = await this.repository.find({
      where: { id: In(ids) },
      relations: ['productType', 'brand'],
    });
    for (const row of rows) map.set(row.id, row);
    return map;
  }

  async findByCode(code: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: {
        code,
        deletedAt: IsNull(),
      },
    });
  }

  async update(id: string, productData: Partial<ProductEntity>): Promise<ProductEntity> {
    await this.repository.update({ id }, {
      ...productData,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<ProductEntity>);

    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException('Product not found after update');
    }
    return updated;
  }

  async updateStatus(
    id: string,
    status: ProductStatus,
    updatedBy?: string,
  ): Promise<ProductEntity> {
    await this.repository.update(
      { id },
      {
        status,
        updatedBy,
        updatedAt: new Date(),
      },
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException('Product not found after status update');
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.update(
      { id },
      {
        deletedAt: new Date(),
      },
    );
  }

  // ==================== Quote Calculator Methods ====================

  async findSolarPanel(
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
      // `wattage` is the REQUIRED attribute on solar_panel and is what this query
      // orders by and what PricingService.extractWattage reads. The previous
      // filter used the OPTIONAL `min_wattage`, so a panel carrying only
      // `wattage` was invisible to a request for its own wattage.
      query.andWhere("(product.specifications->>'wattage')::int = :preferredWattage", {
        preferredWattage,
      });
    }

    query
      .orderBy("(product.specifications->>'wattage')::int", 'DESC')
      .addOrderBy('price.unit_price', 'ASC', 'NULLS LAST');

    return query.getOne();
  }

  async findAllSolarPanels(
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
    phaseType: string,
    productTypeId: string,
    preferredBrand?: string,
    preferredCapacityKw?: number,
  ): Promise<ProductEntity[]> {
    const query = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
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
    productTypeId: string,
    structureType?: string,
  ): Promise<ProductEntity | null> {
    const query = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
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

  async findActiveByStructureType(
    productTypeId: string,
    structureType: string,
    excludeProductId?: string,
  ): Promise<ProductEntity | null> {
    const query = this.repository
      .createQueryBuilder('product')
      .andWhere('product.product_type_id = :productTypeId', { productTypeId })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.deleted_at IS NULL')
      .andWhere("product.specifications->>'structure_type' = :structureType", {
        structureType,
      });

    if (excludeProductId) {
      query.andWhere('product.id != :excludeProductId', { excludeProductId });
    }

    return query.getOne();
  }

  async findByType(productTypeId: string, activeOnly = true): Promise<ProductEntity[]> {
    const where: FindOptionsWhere<ProductEntity> = {
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
        FROM product_prices WHERE is_active = true
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        GROUP BY product_id
      )`,
      'price',
      'price.product_id = product.id',
    );
  }
}
