import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductStatus, ProductType } from '@oneohm-epc/shared/types';

import type { CreateProductDto, UpdateProductDto } from '../dto/products';
import { ProductEntity } from '../entities/product.entity';
import { ProductRepository } from '../repositories/product.repository';

/**
 * Product Service
 * Business logic for product management
 */
@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * Create a new product
   */
  async create(
    organizationId: string,
    createDto: CreateProductDto,
    createdBy?: string,
  ): Promise<ProductEntity> {
    // Check if code already exists
    const existing = await this.productRepository.findByCode(createDto.code, organizationId);
    if (existing) {
      throw new ConflictException(`Product with code '${createDto.code}' already exists`);
    }

    return this.productRepository.create(organizationId, {
      ...createDto,
      status: createDto.status ?? ProductStatus.ACTIVE,
      createdBy,
    });
  }

  /**
   * Get all products with pagination and filters
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
  ): Promise<{ data: ProductEntity[]; total: number; page: number; limit: number }> {
    const result = await this.productRepository.findAll(organizationId, page, limit, filters);

    return {
      ...result,
      page,
      limit,
    };
  }

  /**
   * Get product by ID
   */
  async findById(id: string, organizationId: string): Promise<ProductEntity> {
    const product = await this.productRepository.findById(id, organizationId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  /**
   * Update product
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateProductDto,
    updatedBy?: string,
  ): Promise<ProductEntity> {
    await this.findById(id, organizationId); // Ensure exists

    // Check code uniqueness if changing
    if (updateDto.code) {
      const existing = await this.productRepository.findByCode(updateDto.code, organizationId);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Product with code '${updateDto.code}' already exists`);
      }
    }

    return this.productRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
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
    await this.findById(id, organizationId); // Ensure exists

    return this.productRepository.updateStatus(id, organizationId, status, updatedBy);
  }

  /**
   * Delete product (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId); // Ensure exists
    await this.productRepository.softDelete(id, organizationId);
  }
}
