import { Injectable, NotFoundException } from '@nestjs/common';

import { ProductTypeEntity } from '../entities/product-type.entity';
import { ProductTypeRepository } from '../repositories/product-type.repository';

@Injectable()
export class ProductTypeService {
  constructor(private readonly productTypeRepository: ProductTypeRepository) {}

  async findAll(
    organizationId: string,
    filters?: { isActive?: boolean; search?: string },
  ): Promise<ProductTypeEntity[]> {
    return this.productTypeRepository.findAll(organizationId, filters);
  }

  async findById(id: string, organizationId: string): Promise<ProductTypeEntity> {
    const pt = await this.productTypeRepository.findById(id, organizationId);
    if (!pt) throw new NotFoundException('Product type not found');
    return pt;
  }

  async findByCode(code: string, organizationId: string): Promise<ProductTypeEntity> {
    const pt = await this.productTypeRepository.findByCode(code, organizationId);
    if (!pt) throw new NotFoundException(`Product type '${code}' not found`);
    return pt;
  }

  async create(
    organizationId: string,
    data: Partial<ProductTypeEntity>,
    createdBy?: string,
  ): Promise<ProductTypeEntity> {
    return this.productTypeRepository.create(organizationId, { ...data, createdBy });
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<ProductTypeEntity>,
    updatedBy?: string,
  ): Promise<ProductTypeEntity> {
    await this.findById(id, organizationId);
    return this.productTypeRepository.update(id, organizationId, { ...data, updatedBy });
  }
}
