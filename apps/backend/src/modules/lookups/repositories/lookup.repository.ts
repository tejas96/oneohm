import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LookupScopeType } from '@tejas96/shared/types';
import { IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { LookupEntity } from '../entities/lookup.entity';

export interface LookupFilters {
  typeCode?: string;
  scopeType?: string;
  scopeId?: string;
  parentId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class LookupRepository {
  constructor(
    @InjectRepository(LookupEntity)
    private readonly repository: Repository<LookupEntity>,
  ) {}

  async findAll(filters?: LookupFilters): Promise<{ data: LookupEntity[]; total: number }> {
    const query = this.repository.createQueryBuilder('lookup').where('lookup.deleted_at IS NULL');

    if (filters?.typeCode) {
      query.andWhere('lookup.type_code = :typeCode', { typeCode: filters.typeCode });
    }

    if (filters?.scopeType) {
      query.andWhere('lookup.scope_type = :scopeType', { scopeType: filters.scopeType });
    }

    if (filters?.scopeId) {
      query.andWhere('lookup.scope_id = :scopeId', { scopeId: filters.scopeId });
    }

    if (filters?.parentId) {
      query.andWhere('lookup.parent_id = :parentId', { parentId: filters.parentId });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('lookup.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters?.search) {
      query.andWhere(
        '(lookup.label ILIKE :search OR lookup.code ILIKE :search OR lookup.type_code ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const allowedSortFields: Record<string, string> = {
      label: 'lookup.label',
      code: 'lookup.code',
      typeCode: 'lookup.type_code',
      orderIndex: 'lookup.order_index',
      createdAt: 'lookup.created_at',
      updatedAt: 'lookup.updated_at',
    };
    const sortField =
      (filters?.sortBy && allowedSortFields[filters.sortBy]) ?? 'lookup.order_index';
    const sortOrder = filters?.sortOrder ?? 'ASC';
    query.orderBy(sortField, sortOrder);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findByTypeCode(
    typeCode: string,
    scopeType?: LookupScopeType,
    scopeId?: string,
  ): Promise<LookupEntity[]> {
    const query = this.repository
      .createQueryBuilder('lookup')
      .where('lookup.deleted_at IS NULL')
      .andWhere('lookup.is_active = true')
      .andWhere('lookup.type_code = :typeCode', { typeCode });

    if (scopeType) {
      query.andWhere('lookup.scope_type = :scopeType', { scopeType });
    }

    if (scopeId) {
      query.andWhere('lookup.scope_id = :scopeId', { scopeId });
    }

    query.orderBy('lookup.order_index', 'ASC').addOrderBy('lookup.label', 'ASC');

    return query.getMany();
  }

  /**
   * Returns raw LookupEntity rows for internal service use (no DTO mapping).
   * Ordered by orderIndex ASC so callers can rely on DB-defined order.
   */
  async findByTypeCodeRaw(typeCode: string): Promise<LookupEntity[]> {
    return this.repository.find({
      where: { typeCode, isActive: true, deletedAt: IsNull() },
      order: { orderIndex: 'ASC' },
    });
  }

  async findById(id: string): Promise<LookupEntity | null> {
    return this.repository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  async create(data: Partial<LookupEntity>): Promise<LookupEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<LookupEntity>): Promise<LookupEntity> {
    await this.repository.update({ id }, {
      ...data,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<LookupEntity>);
    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('Lookup not found');
    return updated;
  }

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.repository.update({ id }, {
      deletedAt: new Date(),
      updatedBy: deletedBy,
    } as QueryDeepPartialEntity<LookupEntity>);
  }

  async checkDuplicate(
    typeCode: string,
    code: string,
    scopeType: LookupScopeType,
    scopeId: string | undefined,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('lookup')
      .where('lookup.deleted_at IS NULL')
      .andWhere('lookup.type_code = :typeCode', { typeCode })
      .andWhere('lookup.code = :code', { code })
      .andWhere('lookup.scope_type = :scopeType', { scopeType });

    if (scopeId) {
      query.andWhere('lookup.scope_id = :scopeId', { scopeId });
    } else {
      query.andWhere('lookup.scope_id IS NULL');
    }

    if (excludeId) {
      query.andWhere('lookup.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
