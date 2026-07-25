import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { DiscomEntity } from '../entities/discom.entity';

export interface DiscomListFilters {
  isActive?: boolean;
  includeInactive?: boolean;
  search?: string;
  circleName?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface DiscomListStats {
  circles: number;
  active: number;
  linkedProperties: number;
}

@Injectable()
export class DiscomRepository {
  constructor(
    @InjectRepository(DiscomEntity)
    private readonly repository: Repository<DiscomEntity>,
  ) {}

  private applyListFilters(
    query: ReturnType<Repository<DiscomEntity>['createQueryBuilder']>,
    filters?: DiscomListFilters,
  ): void {
    query.where('discom.deleted_at IS NULL');

    if (!filters?.includeInactive) {
      query.andWhere('discom.is_active = :isActive', {
        isActive: filters?.isActive ?? true,
      });
    } else if (filters?.isActive !== undefined) {
      query.andWhere('discom.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters?.circleName) {
      query.andWhere('LOWER(discom.circle_name) = LOWER(:circleName)', {
        circleName: filters.circleName,
      });
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query.andWhere(
        `(
          LOWER(discom.circle_name) LIKE :searchTerm OR
          LOWER(discom.division_name) LIKE :searchTerm OR
          LOWER(discom.subdivision_name) LIKE :searchTerm OR
          LOWER(discom.section_name) LIKE :searchTerm OR
          LOWER(discom.circle_incharge_name) LIKE :searchTerm OR
          LOWER(discom.division_incharge_name) LIKE :searchTerm
        )`,
        { searchTerm },
      );
    }
  }

  async findAll(
    filters?: DiscomListFilters,
  ): Promise<{ data: (DiscomEntity & { linkedPropertiesCount: number })[]; total: number }> {
    const query = this.repository.createQueryBuilder('discom').addSelect(
      `(SELECT COUNT(*)::int FROM customer_properties p
          WHERE p.discom_id = discom.id AND p.deleted_at IS NULL)`,
      'linkedPropertiesCount',
    );

    this.applyListFilters(query, filters);

    const allowedSortFields: Record<string, string> = {
      circleName: 'discom.circle_name',
      divisionName: 'discom.division_name',
      sectionName: 'discom.section_name',
      createdAt: 'discom.created_at',
      updatedAt: 'discom.updated_at',
      isActive: 'discom.is_active',
    };
    const sortField =
      (filters?.sortBy && allowedSortFields[filters.sortBy]) ?? 'discom.division_name';
    const sortOrder = filters?.sortOrder ?? 'ASC';
    query.orderBy(sortField, sortOrder);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const total = await query.getCount();

    const { entities, raw } = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    const data = entities.map((entity, index) => ({
      ...entity,
      linkedPropertiesCount: Number(raw[index]?.linkedPropertiesCount ?? 0),
    }));

    return { data, total };
  }

  async findListStats(filters?: DiscomListFilters): Promise<DiscomListStats> {
    const statsQuery = this.repository.createQueryBuilder('discom');
    this.applyListFilters(statsQuery, filters);

    const result = await statsQuery
      .select('COUNT(DISTINCT discom.circle_name)', 'circles')
      .addSelect('COUNT(*) FILTER (WHERE discom.is_active = true)', 'active')
      .addSelect(
        `COALESCE(SUM(
          (SELECT COUNT(*)::int FROM customer_properties p
           WHERE p.discom_id = discom.id AND p.deleted_at IS NULL)
        ), 0)`,
        'linkedProperties',
      )
      .getRawOne<{ circles: string; active: string; linkedProperties: string }>();

    return {
      circles: Number(result?.circles ?? 0),
      active: Number(result?.active ?? 0),
      linkedProperties: Number(result?.linkedProperties ?? 0),
    };
  }

  async findDistinctCircleNames(filters?: DiscomListFilters): Promise<string[]> {
    const query = this.repository
      .createQueryBuilder('discom')
      .select('DISTINCT discom.circle_name', 'circleName')
      .orderBy('discom.circle_name', 'ASC');

    this.applyListFilters(query, filters);

    const rows = await query.getRawMany<{ circleName: string }>();
    return rows.map((row) => row.circleName).filter(Boolean);
  }

  async findById(id: string): Promise<DiscomEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull(), isActive: true },
    });
  }

  async findByIdIncludingInactive(id: string): Promise<DiscomEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async findByHierarchy(data: {
    circleName: string;
    divisionName: string;
    subdivisionName?: string | null;
    sectionName?: string | null;
  }): Promise<DiscomEntity | null> {
    const query = this.repository
      .createQueryBuilder('discom')
      .where('discom.deleted_at IS NULL')
      .andWhere('LOWER(discom.circle_name) = LOWER(:circleName)', {
        circleName: data.circleName,
      })
      .andWhere('LOWER(discom.division_name) = LOWER(:divisionName)', {
        divisionName: data.divisionName,
      });

    if (data.subdivisionName?.trim()) {
      query.andWhere('LOWER(discom.subdivision_name) = LOWER(:subdivisionName)', {
        subdivisionName: data.subdivisionName,
      });
    } else {
      query.andWhere('discom.subdivision_name IS NULL');
    }

    if (data.sectionName?.trim()) {
      query.andWhere('LOWER(discom.section_name) = LOWER(:sectionName)', {
        sectionName: data.sectionName,
      });
    } else {
      query.andWhere('discom.section_name IS NULL');
    }

    return query.getOne();
  }

  async countActiveProperties(id: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('discom')
      .innerJoin('discom.properties', 'property', 'property.deleted_at IS NULL')
      .where('discom.id = :id', { id })
      .andWhere('discom.deleted_at IS NULL')
      .getCount();

    return result;
  }

  async create(data: Partial<DiscomEntity>): Promise<DiscomEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<DiscomEntity>): Promise<DiscomEntity> {
    await this.repository.update({ id }, {
      ...data,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<DiscomEntity>);
    const updated = await this.findByIdIncludingInactive(id);
    if (!updated) throw new Error('Discom not found after update');
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.update({ id }, {
      deletedAt: new Date(),
    } as QueryDeepPartialEntity<DiscomEntity>);
  }
}
