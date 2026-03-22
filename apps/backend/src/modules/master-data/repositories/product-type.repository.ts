import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    filters?: {
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ data: ProductTypeEntity[]; total: number }> {
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

    // TypeORM getManyAndCount() crashes with "alias was not found" when a query
    // has both leftJoinAndSelect and addOrderBy. Split into separate count + data
    // queries to avoid this entirely.
    const total = await query.getCount();

    const allowedSortFields: Record<string, string> = {
      name: 'productType.name',
      sortOrder: 'productType.sortOrder',
      defaultGstRate: 'productType.defaultGstRate',
      createdAt: 'productType.createdAt',
      updatedAt: 'productType.updatedAt',
    };
    const sortField =
      (filters?.sortBy && allowedSortFields[filters.sortBy]) ?? 'productType.sortOrder';
    const sortOrder = filters?.sortOrder ?? 'ASC';

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const data = await query
      .orderBy(sortField, sortOrder)
      .addOrderBy('productType.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findById(id: string, organizationId: string): Promise<ProductTypeEntity | null> {
    return this.repository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ['attributes'],
    });
  }

  async findByCode(code: string, organizationId: string): Promise<ProductTypeEntity | null> {
    return this.repository.findOne({
      where: { code, organizationId, deletedAt: IsNull(), isActive: true },
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
        throw new NotFoundException('Product type not found');
      }

      let resolvedAttributes: ProductTypeAttributeEntity[] | undefined;
      if (data.attributes !== undefined) {
        const existingAttributes = existing.attributes ?? [];
        const byId = new Map(existingAttributes.map((attr) => [attr.id, attr]));
        const byKey = new Map(existingAttributes.map((attr) => [attr.attributeKey, attr]));

        const systemAttrs = existingAttributes.filter((a) => a.isSystem);
        const systemAttrIds = new Set(systemAttrs.map((a) => a.id));

        for (const incomingAttr of data.attributes) {
          if (!incomingAttr.id) continue;
          const existingAttr = byId.get(incomingAttr.id);
          if (
            existingAttr?.isSystem &&
            incomingAttr.attributeKey &&
            incomingAttr.attributeKey !== existingAttr.attributeKey
          ) {
            throw new BadRequestException(
              `Cannot change key of system attribute '${existingAttr.attributeKey}'`,
            );
          }
        }

        const nextAttributes = data.attributes.map((attr) => {
          const base =
            attr.id && byId.get(attr.id) ? byId.get(attr.id) : byKey.get(attr.attributeKey);

          return attrRepo.create({
            ...base,
            ...attr,
            productTypeId: id,
          });
        });

        const incomingIds = new Set(
          nextAttributes.map((a) => a.id).filter((aid): aid is string => Boolean(aid)),
        );
        const incomingKeys = new Set(nextAttributes.map((a) => a.attributeKey));

        for (const sysAttr of systemAttrs) {
          if (!incomingIds.has(sysAttr.id) && !incomingKeys.has(sysAttr.attributeKey)) {
            nextAttributes.push(attrRepo.create({ ...sysAttr }));
          }
        }

        const keepIds = nextAttributes
          .map((attr) => attr.id)
          .filter((aid): aid is string => Boolean(aid));

        if (existingAttributes.length > 0) {
          const idsToKeep = [...new Set([...keepIds, ...systemAttrIds])];
          if (idsToKeep.length > 0) {
            await attrRepo.delete({
              productTypeId: id,
              id: Not(In(idsToKeep)),
              isSystem: false,
            });
          } else {
            await attrRepo.delete({ productTypeId: id, isSystem: false });
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
