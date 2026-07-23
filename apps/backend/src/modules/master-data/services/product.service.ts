import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@tejas96/shared/types';
import { normalizeStructureTypeCode } from '@tejas96/shared/utils';
import { QueryFailedError } from 'typeorm';

import type { CreateProductDto, UpdateProductDto } from '../dto/products';
import { ProductEntity } from '../entities/product.entity';
import { ProductTypeRepository } from '../repositories/product-type.repository';
import { ProductRepository } from '../repositories/product.repository';

const MOUNTING_STRUCTURE_CODE = 'mounting_structure';
const STRUCTURE_TYPE_KEY = 'structure_type';
const UNIQUE_STRUCTURE_TYPE_INDEX = 'idx_products_unique_active_structure_type';

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

    const preparedDto = await this.prepareMountingStructureDto(organizationId, createDto);

    try {
      return await this.productRepository.create(organizationId, {
        ...preparedDto,
        status: preparedDto.status ?? ProductStatus.ACTIVE,
        createdBy,
      });
    } catch (error) {
      this.rethrowKnownErrors(error);
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
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      hasActivePrice?: boolean;
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
    const existing = await this.findById(id, organizationId);

    if (updateDto.code) {
      const codeConflict = await this.productRepository.findByCode(updateDto.code, organizationId);
      if (codeConflict && codeConflict.id !== id) {
        throw new ConflictException(`Product with code '${updateDto.code}' already exists`);
      }
    }

    const preparedDto = await this.prepareMountingStructureDto(
      organizationId,
      updateDto,
      existing,
      id,
    );

    try {
      return await this.productRepository.update(id, organizationId, {
        ...preparedDto,
        updatedBy,
      });
    } catch (error) {
      this.rethrowKnownErrors(error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: ProductStatus,
    updatedBy?: string,
  ): Promise<ProductEntity> {
    if (status === ProductStatus.ACTIVE) {
      const existing = await this.findById(id, organizationId);
      await this.ensureMountingStructureReadyForActivation(organizationId, existing, id, updatedBy);
    } else {
      await this.findById(id, organizationId);
    }

    try {
      return await this.productRepository.updateStatus(id, organizationId, status, updatedBy);
    } catch (error) {
      this.rethrowKnownErrors(error);
      throw error;
    }
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.productRepository.softDelete(id, organizationId);
  }

  private async prepareMountingStructureDto(
    organizationId: string,
    dto: CreateProductDto | UpdateProductDto,
    existing?: ProductEntity,
    excludeProductId?: string,
  ): Promise<CreateProductDto | UpdateProductDto> {
    const productTypeId = dto.productTypeId ?? existing?.productTypeId;
    if (!productTypeId) return dto;

    const productType = await this.productTypeRepository.findById(productTypeId, organizationId);
    if (productType?.code !== MOUNTING_STRUCTURE_CODE) {
      return dto;
    }

    const specs = { ...(dto.specifications ?? existing?.specifications ?? {}) };
    const rawStructureType = specs[STRUCTURE_TYPE_KEY];
    const normalized =
      typeof rawStructureType === 'string' ? normalizeStructureTypeCode(rawStructureType) : null;

    if (!normalized) {
      throw new BadRequestException('Structure type is required and must be a valid code');
    }

    specs[STRUCTURE_TYPE_KEY] = normalized;

    const nextStatus = dto.status ?? existing?.status ?? ProductStatus.ACTIVE;
    if (nextStatus === ProductStatus.ACTIVE) {
      await this.assertUniqueActiveStructureType(
        organizationId,
        productTypeId,
        { ...existing, specifications: specs, status: nextStatus } as ProductEntity,
        excludeProductId,
      );
    }

    return {
      ...dto,
      specifications: specs,
    };
  }

  private async ensureMountingStructureReadyForActivation(
    organizationId: string,
    existing: ProductEntity,
    excludeProductId: string,
    updatedBy?: string,
  ): Promise<ProductEntity> {
    const productType = await this.productTypeRepository.findById(
      existing.productTypeId,
      organizationId,
    );
    if (productType?.code !== MOUNTING_STRUCTURE_CODE) {
      return existing;
    }

    const specs = { ...(existing.specifications ?? {}) };
    const rawStructureType = specs[STRUCTURE_TYPE_KEY];
    const normalized =
      typeof rawStructureType === 'string' ? normalizeStructureTypeCode(rawStructureType) : null;

    if (!normalized) {
      throw new BadRequestException('Structure type is required and must be a valid code');
    }

    let nextExisting = existing;
    if (normalized !== rawStructureType) {
      specs[STRUCTURE_TYPE_KEY] = normalized;
      nextExisting = await this.productRepository.update(excludeProductId, organizationId, {
        specifications: specs,
        updatedBy,
      });
    }

    await this.assertUniqueActiveStructureType(
      organizationId,
      nextExisting.productTypeId,
      { ...nextExisting, status: ProductStatus.ACTIVE },
      excludeProductId,
    );

    return nextExisting;
  }

  private async assertUniqueActiveStructureType(
    organizationId: string,
    productTypeId: string,
    product: Pick<ProductEntity, 'specifications' | 'status'>,
    excludeProductId?: string,
  ): Promise<void> {
    if (product.status !== ProductStatus.ACTIVE) return;

    const raw = product.specifications?.[STRUCTURE_TYPE_KEY];
    const structureType = typeof raw === 'string' ? normalizeStructureTypeCode(raw) : null;
    if (!structureType) return;

    const conflict = await this.productRepository.findActiveByStructureType(
      organizationId,
      productTypeId,
      structureType,
      excludeProductId,
    );

    if (conflict) {
      throw new ConflictException(
        `An active mounting structure product already exists for structure type '${structureType}'.`,
      );
    }
  }

  private rethrowKnownErrors(error: unknown): void {
    if (error instanceof QueryFailedError) {
      const pgError = error as unknown as {
        code?: string;
        constraint?: string;
        driverError?: { message?: string; constraint?: string };
      };
      const constraint = pgError.constraint ?? pgError.driverError?.constraint;
      const detail = pgError.driverError?.message ?? '';

      if (
        pgError.code === '23505' &&
        (constraint === UNIQUE_STRUCTURE_TYPE_INDEX || detail.includes(UNIQUE_STRUCTURE_TYPE_INDEX))
      ) {
        throw new ConflictException(
          'An active mounting structure product already exists for this structure type.',
        );
      }

      if (pgError.code === 'P0001') {
        const message = pgError.driverError?.message || 'Invalid product specifications';
        throw new BadRequestException(message);
      }
    }
  }
}
