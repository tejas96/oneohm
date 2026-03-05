import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';

import { PermissionEntity } from '../entities/permission.entity';

export interface PermissionListFilters {
  search?: string;
  action?: string;
  scope?: string;
}

@Injectable()
export class PermissionRepository {
  constructor(
    @InjectRepository(PermissionEntity)
    public readonly repository: Repository<PermissionEntity>,
  ) {}

  async findByCode(code: string): Promise<PermissionEntity | null> {
    return this.repository.findOne({
      where: { code, isActive: true },
    });
  }

  async findByCodes(codes: string[]): Promise<PermissionEntity[]> {
    return this.repository.find({
      where: { code: In(codes), isActive: true },
    });
  }

  async findByScope(
    scope: 'all' | 'own' | 'department' | 'assigned' | 'custom',
  ): Promise<PermissionEntity[]> {
    return this.repository.find({
      where: { scope, isActive: true },
    });
  }

  async create(data: Partial<PermissionEntity>): Promise<PermissionEntity> {
    const permission = this.repository.create(data);
    return this.repository.save(permission);
  }

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

    if (filters?.action) {
      qb.andWhere('permission.action = :action', { action: filters.action });
    }

    if (filters?.scope) {
      qb.andWhere('permission.scope = :scope', { scope: filters.scope });
    }

    qb.orderBy('permission.action', 'ASC').addOrderBy('permission.name', 'ASC');
    qb.skip(skip).take(take);

    return qb.getManyAndCount();
  }

  async findAll(): Promise<PermissionEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { action: 'ASC', name: 'ASC' },
    });
  }

  async update(id: string, data: Partial<PermissionEntity>): Promise<void> {
    const permission = await this.repository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    Object.assign(permission, data);
    await this.repository.save(permission);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
