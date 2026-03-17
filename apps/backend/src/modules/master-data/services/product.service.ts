import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@oneohm-epc/shared/types';
import { QueryFailedError } from 'typeorm';

import type { CreateProductDto, UpdateProductDto } from '../dto/products';
import { ProductEntity } from '../entities/product.entity';
import { ProductTypeRepository } from '../repositories/product-type.repository';
import { ProductRepository } from '../repositories/product.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  async create(
    organizationId: string,
    createDto: CreateProductDto,
    createdBy?: string,
  ): Promise<ProductEntity> {
    const existing = await this.productRepository.findByCode(createDto.code, organizationId);
    if (existing) {
      throw new ConflictException(`Product with code '${createDto.code}' already exists`);
    }

    try {
      return await this.productRepository.create(organizationId, {
        ...createDto,
        status: createDto.status ?? ProductStatus.ACTIVE,
        createdBy,
      });
    } catch (error) {
      this.rethrowSpecificationError(error);
      throw error;
    }
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: ProductStatus;
      productTypeId?: string;
      type?: string;
      brandId?: string;
      brand?: string;
      search?: string;
    },
  ): Promise<{ data: ProductEntity[]; total: number; page: number; limit: number }> {
    const resolvedFilters = { ...filters };

    if (resolvedFilters.type && !resolvedFilters.productTypeId) {
      const pt = await this.productTypeRepository.findByCode(resolvedFilters.type, organizationId);
      if (pt) resolvedFilters.productTypeId = pt.id;
      delete resolvedFilters.type;
    }

    const result = await this.productRepository.findAll(
      organizationId,
      page,
      limit,
      resolvedFilters,
    );

    return {
      ...result,
      page,
      limit,
    };
  }

  async findById(id: string, organizationId: string): Promise<ProductEntity> {
    const product = await this.productRepository.findById(id, organizationId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateProductDto,
    updatedBy?: string,
  ): Promise<ProductEntity> {
    await this.findById(id, organizationId);

    if (updateDto.code) {
      const existing = await this.productRepository.findByCode(updateDto.code, organizationId);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Product with code '${updateDto.code}' already exists`);
      }
    }

    try {
      return await this.productRepository.update(id, organizationId, {
        ...updateDto,
        updatedBy,
      });
    } catch (error) {
      this.rethrowSpecificationError(error);
      throw error;
    }
  }

  private rethrowSpecificationError(error: unknown): void {
    if (!(error instanceof QueryFailedError)) return;

    const driverError = error as unknown as { code?: string; driverError?: { message?: string } };
    if (driverError.code !== 'P0001') return;

    const message = driverError.driverError?.message || 'Invalid product specifications';
    throw new BadRequestException(message);
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: ProductStatus,
    updatedBy?: string,
  ): Promise<ProductEntity> {
    await this.findById(id, organizationId);
    return this.productRepository.updateStatus(id, organizationId, status, updatedBy);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.productRepository.softDelete(id, organizationId);
  }
}
