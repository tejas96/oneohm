import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';

import { ProductTypeAttributeEntity } from '../entities/product-type-attribute.entity';
import { ProductTypeEntity } from '../entities/product-type.entity';

@Injectable()
export class ProductTypeRepository {
  constructor(
    @InjectRepository(ProductTypeEntity)
    private readonly repository: Repository<ProductTypeEntity>,
  ) {}

  async findAll(
    organizationId: string,
    filters?: { isActive?: boolean; search?: string },
  ): Promise<ProductTypeEntity[]> {
    const query = this.repository
      .createQueryBuilder('productType')
      .leftJoinAndSelect('productType.attributes', 'attributes')
      .where('productType.organization_id = :organizationId', { organizationId })
      .andWhere('productType.deleted_at IS NULL');

    if (filters?.isActive !== undefined) {
      query.andWhere('productType.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters?.search) {
      query.andWhere('(productType.name ILIKE :search OR productType.code ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return query
      .orderBy('productType.sort_order', 'ASC')
      .addOrderBy('productType.name', 'ASC')
      .getMany();
  }

  async findById(id: string, organizationId: string): Promise<ProductTypeEntity | null> {
    return this.repository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ['attributes'],
    });
  }

  async findByCode(code: string, organizationId: string): Promise<ProductTypeEntity | null> {
    return this.repository.findOne({
      where: { code, organizationId, deletedAt: IsNull() },
      relations: ['attributes'],
    });
  }

  async create(
    organizationId: string,
    data: Partial<ProductTypeEntity>,
  ): Promise<ProductTypeEntity> {
    const entity = this.repository.create({ ...data, organizationId });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<ProductTypeEntity>,
  ): Promise<ProductTypeEntity> {
    return this.repository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductTypeEntity);
      const attrRepo = manager.getRepository(ProductTypeAttributeEntity);
      const existing = await repo.findOne({
        where: { id, organizationId, deletedAt: IsNull() },
        relations: ['attributes'],
      });
      if (!existing) {
        throw new Error('Product type not found after update');
      }

      let resolvedAttributes: ProductTypeAttributeEntity[] | undefined;
      if (data.attributes !== undefined) {
        const existingAttributes = existing.attributes ?? [];
        const byId = new Map(existingAttributes.map((attr) => [attr.id, attr]));
        const byKey = new Map(existingAttributes.map((attr) => [attr.attributeKey, attr]));

        const nextAttributes = data.attributes.map((attr) => {
          const base =
            attr.id && byId.get(attr.id) ? byId.get(attr.id) : byKey.get(attr.attributeKey);

          return attrRepo.create({
            ...base,
            ...attr,
            productTypeId: id,
          });
        });

        const keepIds = nextAttributes
          .map((attr) => attr.id)
          .filter((id): id is string => Boolean(id));
        if (existingAttributes.length > 0) {
          if (keepIds.length > 0) {
            await attrRepo.delete({ productTypeId: id, id: Not(In(keepIds)) });
          } else {
            await attrRepo.delete({ productTypeId: id });
          }
        }

        if (nextAttributes.length > 0) {
          await attrRepo.save(nextAttributes);
        }

        resolvedAttributes = await attrRepo.find({
          where: { productTypeId: id },
          order: { sortOrder: 'ASC' },
        });
      }

      const updated = repo.create({
        ...existing,
        ...data,
        attributes: resolvedAttributes ?? existing.attributes,
        updatedAt: new Date(),
      });
      await repo.save(updated);

      return updated;
    });
  }
}
