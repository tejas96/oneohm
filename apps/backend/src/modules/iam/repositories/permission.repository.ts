import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { PermissionEntity } from '../entities/permission.entity';

export interface PermissionListFilters {
  search?: string;
  module?: string;
}

/**
 * Read-only.
 *
 * The catalog is fixed in `apps/web/lib/rbac/catalog.ts` and written to this
 * table by migration, so there is nothing here to create, update or delete.
 * The write methods were removed along with the controller endpoints that
 * called them — see 1855000000000-ResetRbacCatalog.
 */
@Injectable()
export class PermissionRepository {
  constructor(
    @InjectRepository(PermissionEntity)
    public readonly repository: Repository<PermissionEntity>,
  ) {}

  async findOne(
    criteria: Parameters<Repository<PermissionEntity>['findOne']>[0],
  ): Promise<PermissionEntity | null> {
    return this.repository.findOne(criteria);
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters?: PermissionListFilters,
  ): Promise<[PermissionEntity[], number]> {
    const qb: SelectQueryBuilder<PermissionEntity> =
      this.repository.createQueryBuilder('permission');

    if (filters?.search) {
      qb.andWhere('(permission.name ILIKE :search OR permission.code ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.module) {
      qb.andWhere('permission.module = :module', { module: filters.module });
    }

    qb.orderBy('permission.module', 'ASC').addOrderBy('permission.name', 'ASC');
    qb.skip(skip).take(take);

    return qb.getManyAndCount();
  }
}
