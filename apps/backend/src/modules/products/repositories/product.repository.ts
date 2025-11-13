import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductStatus } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

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
      type?: string;
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
      },
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
}
