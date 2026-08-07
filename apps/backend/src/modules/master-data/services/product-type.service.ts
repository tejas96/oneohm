import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { ProductTypeEntity } from '../entities/product-type.entity';
import { ProductTypeRepository } from '../repositories/product-type.repository';

export interface PaginatedProductTypes {
  data: ProductTypeEntity[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class ProductTypeService {
  constructor(private readonly productTypeRepository: ProductTypeRepository) {}

  async findAll(
    filters?: {
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<PaginatedProductTypes> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const { data, total } = await this.productTypeRepository.findAll(filters);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findById(id: string): Promise<ProductTypeEntity> {
    const pt = await this.productTypeRepository.findById(id);
    if (!pt) throw new NotFoundException('Product type not found');
    return pt;
  }

  async findByCode(code: string): Promise<ProductTypeEntity> {
    const pt = await this.productTypeRepository.findByCode(code);
    if (!pt) throw new NotFoundException(`Product type '${code}' not found`);
    return pt;
  }

  async create(
    data: Partial<ProductTypeEntity>,
    createdBy?: string,
  ): Promise<ProductTypeEntity> {
    if (!data.name?.trim()) {
      throw new BadRequestException('Product type name is required');
    }
    if (!data.code?.trim()) {
      throw new BadRequestException('Product type code is required');
    }

    const sanitized = { ...data, createdBy };
    delete (sanitized as Record<string, unknown>).isSystem;
    delete (sanitized as Record<string, unknown>).deletedAt;

    try {
      return await this.productTypeRepository.create(sanitized);
    } catch (error: unknown) {
      if (!(error instanceof QueryFailedError)) throw error;

      const pgError = error as unknown as { code?: string };
      if (pgError.code === '23505') {
        throw new BadRequestException('A product type with this code already exists');
      }
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<ProductTypeEntity>,
    updatedBy?: string,
  ): Promise<ProductTypeEntity> {
    const existing = await this.findById(id);

    const sanitized = { ...data, updatedBy };
    delete (sanitized as Record<string, unknown>).isSystem;
    delete (sanitized as Record<string, unknown>).deletedAt;

    if (existing.isSystem) {
      if (sanitized.code !== undefined && sanitized.code !== existing.code) {
        throw new BadRequestException(
          `Cannot change code of system product type '${existing.code}'`,
        );
      }
      if (sanitized.isActive === false) {
        throw new BadRequestException(`Cannot deactivate system product type '${existing.code}'`);
      }
    }

    return this.productTypeRepository.update(id, sanitized);
  }
}
