import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PhaseType, ProductStatus, ProductType, StructureType } from '@oneohm-epc/shared-types';
import { IsNull, Repository, type FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { ProductEntity } from '../entities/product.entity';

/**
 * Product Repository
 * Handles database operations for products
 */
@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repository: Repository<ProductEntity>,
  ) {}

  /**
   * Create a new product
   */
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

  /**
   * Find all products with pagination and filters
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: ProductStatus;
      type?: ProductType;
      categoryId?: string;
      brand?: string;
      search?: string;
    },
  ): Promise<{ data: ProductEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.deleted_at IS NULL');

    if (filters?.status) {
      query.andWhere('product.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('product.type = :type', { type: filters.type });
    }

    if (filters?.categoryId) {
      query.andWhere('product.category_id = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters?.brand) {
      query.andWhere('product.brand ILIKE :brand', { brand: `%${filters.brand}%` });
    }

    if (filters?.search) {
      query.andWhere(
        '(product.name ILIKE :search OR product.code ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('product.name', 'ASC')
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Find product by ID
   */
  async findById(id: string, organizationId: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        organizationId,
        deletedAt: IsNull(),
      },
      relations: ['category'],
    });
  }

  /**
   * Find product by code
   */
  async findByCode(code: string, organizationId: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: {
        code,
        organizationId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Update product
   */
  async update(
    id: string,
    organizationId: string,
    productData: Partial<ProductEntity>,
  ): Promise<ProductEntity> {
    await this.repository.update(
      { id, organizationId },
      {
        ...productData,
        updatedAt: new Date(),
      } as QueryDeepPartialEntity<ProductEntity>, // TypeORM has issues with deep JSONB typing for specifications field
    );

    const updated = await this.findById(id, organizationId);
    if (!updated) {
      throw new Error('Product not found after update');
    }
    return updated;
  }

  /**
   * Update product status
   */
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
      throw new Error('Product not found after status update');
    }
    return updated;
  }

  /**
   * Soft delete product
   */
  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repository.update(
      { id, organizationId },
      {
        deletedAt: new Date(),
      },
    );
  }

  // ==================== Quote Calculator Methods ====================

  /**
   * Find solar panel by DCR status and optional brand/technology/wattage preference
   * If preferredWattage is specified, finds panel with matching minWattage
   * Otherwise returns highest wattage panel matching criteria
   */
  async findSolarPanel(
    organizationId: string,
    isDcr: boolean,
    preferredBrand?: string,
    preferredTechnology?: string,
    preferredWattage?: number,
  ): Promise<ProductEntity | null> {
    const query = this.repository
      .createQueryBuilder('product')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.type = :type', { type: ProductType.SOLAR_PANEL })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.deleted_at IS NULL')
      .andWhere("product.specifications->'panel'->>'isDcr' = :isDcr", {
        isDcr: isDcr.toString(),
      });

    if (preferredBrand) {
      query.andWhere('LOWER(product.brand) = LOWER(:brand)', { brand: preferredBrand });
    }

    if (preferredTechnology) {
      query.andWhere("LOWER(product.specifications->'panel'->>'technology') = LOWER(:technology)", {
        technology: preferredTechnology,
      });
    }

    // If specific wattage is preferred, match by minWattage (e.g., 560 for 560-580Wp range)
    if (preferredWattage) {
      query.andWhere("(product.specifications->'panel'->>'minWattage')::int = :preferredWattage", {
        preferredWattage,
      });
    }

    // Order by wattage descending (prefer higher wattage panels when no specific wattage requested)
    query.orderBy("(product.specifications->'panel'->>'wattage')::int", 'DESC');

    return query.getOne();
  }

  /**
   * Find ALL solar panels by DCR status and optional brand/technology preference
   * Returns all matching panels sorted by wattage ascending (for quantity-constrained selection)
   *
   * Used when user specifies a manual panel count and backend needs to find
   * the best wattage panel to meet the required capacity.
   *
   * @param organizationId - Organization ID
   * @param isDcr - Whether to find DCR or Non-DCR panels
   * @param preferredBrand - Optional brand filter
   * @param preferredTechnology - Optional technology filter (PERC/TOPCON)
   * @param minWattage - Optional minimum wattage filter (panels with wattage >= this value)
   * @returns Array of matching panels sorted by wattage ascending
   */
  async findAllSolarPanels(
    organizationId: string,
    isDcr: boolean,
    preferredBrand?: string,
    preferredTechnology?: string,
    minWattage?: number,
  ): Promise<ProductEntity[]> {
    const query = this.repository
      .createQueryBuilder('product')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.type = :type', { type: ProductType.SOLAR_PANEL })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.deleted_at IS NULL')
      .andWhere("product.specifications->'panel'->>'isDcr' = :isDcr", {
        isDcr: isDcr.toString(),
      });

    if (preferredBrand) {
      query.andWhere('LOWER(product.brand) = LOWER(:brand)', { brand: preferredBrand });
    }

    if (preferredTechnology) {
      query.andWhere("LOWER(product.specifications->'panel'->>'technology') = LOWER(:technology)", {
        technology: preferredTechnology,
      });
    }

    // Filter by minimum wattage if specified (for quantity-constrained selection)
    if (minWattage) {
      query.andWhere("(product.specifications->'panel'->>'wattage')::int >= :minWattage", {
        minWattage: Math.ceil(minWattage),
      });
    }

    // Order by wattage ascending (prefer lower wattage panels to minimize overage)
    query.orderBy("(product.specifications->'panel'->>'wattage')::int", 'ASC');

    return query.getMany();
  }

  /**
   * Find all inverters by phase type and optional brand preference
   * Returns inverters ordered by capacity descending (for combination algorithm)
   */
  async findInvertersByPhase(
    organizationId: string,
    phaseType: PhaseType,
    preferredBrand?: string,
    preferredCapacityKw?: number,
  ): Promise<ProductEntity[]> {
    const query = this.repository
      .createQueryBuilder('product')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.type = :type', { type: ProductType.INVERTER })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.deleted_at IS NULL')
      .andWhere("product.specifications->'inverter'->>'phaseType' = :phaseType", { phaseType });

    if (preferredBrand) {
      query.andWhere('LOWER(product.brand) = LOWER(:brand)', { brand: preferredBrand });
    }

    if (preferredCapacityKw !== undefined) {
      query.andWhere("(product.specifications->'inverter'->>'capacityKw')::float = :capacityKw", {
        capacityKw: preferredCapacityKw,
      });
    }

    // Order by capacity descending for greedy algorithm
    query.orderBy("(product.specifications->'inverter'->>'capacityKw')::float", 'DESC');

    return query.getMany();
  }

  /**
   * Find mounting structure product
   * Returns active structure for the organization, optionally filtered by type
   */
  async findMountingStructure(
    organizationId: string,
    structureType?: StructureType,
  ): Promise<ProductEntity | null> {
    const query = this.repository
      .createQueryBuilder('product')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.type = :type', { type: ProductType.MOUNTING_STRUCTURE })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.deleted_at IS NULL');

    if (structureType) {
      query.andWhere("product.specifications->'structure'->>'structureType' = :structureType", {
        structureType,
      });
    }

    return query.getOne();
  }

  /**
   * Find products by type
   */
  async findByType(
    organizationId: string,
    productType: ProductType,
    activeOnly = true,
  ): Promise<ProductEntity[]> {
    const where: FindOptionsWhere<ProductEntity> = {
      organizationId,
      type: productType,
      deletedAt: IsNull(),
    };

    if (activeOnly) {
      where.status = ProductStatus.ACTIVE;
    }

    return this.repository.find({
      where,
      order: { name: 'ASC' },
    });
  }
}
