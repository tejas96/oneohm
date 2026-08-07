import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';

import { RoleEntity } from '../entities/role.entity';

export interface RoleListFilters {
  search?: string;
  isSystemRole?: boolean;
}

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    public readonly repository: Repository<RoleEntity>,
  ) {}

  /**
   * Find role by code and organization
   * Pass null for organizationId to find platform-level roles
   */
  async findByCodeAndOrganization(
    code: string,
  ): Promise<RoleEntity | null> {
    // For platform roles, organization_id IS NULL

    return this.repository.findOne({
      where: { code, deletedAt: IsNull() },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Find platform-level role by code (organization_id IS NULL)
   */
  async findPlatformRoleByCode(code: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { code, deletedAt: IsNull() },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Find all roles for an organization
   */
  async findByOrganization(
    skip?: number,
    take?: number,
  ): Promise<[RoleEntity[], number]> {
    return this.repository.findAndCount({
      where: { deletedAt: IsNull() },
      order: { level: 'ASC', name: 'ASC' },
      skip,
      take,
    });
  }

  /**
   * Find system roles for an organization
   */
  async findSystemRoles(): Promise<RoleEntity[]> {
    return this.repository.find({
      where: { isSystemRole: true, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get role with permissions
   */
  async findWithPermissions(roleId: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { id: roleId, deletedAt: IsNull() },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Check if role code exists in organization
   */
  async existsByCodeAndOrganization(
    code: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('role')
      .where('role.code = :code', { code })
      .andWhere('role.deleted_at IS NULL');

    if (excludeId) {
      query.andWhere('role.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Paginated listing with optional search and filters.
   * When organizationId is omitted, returns roles across all orgs + platform roles.
   */
  async findAllPaginated(
    skip: number,
    take: number,
    filters?: RoleListFilters,
  ): Promise<[RoleEntity[], number]> {
    const qb: SelectQueryBuilder<RoleEntity> = this.repository
      .createQueryBuilder('role')
      .where('role.deleted_at IS NULL');


    if (filters?.search) {
      qb.andWhere('(role.name ILIKE :search OR role.code ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.isSystemRole !== undefined) {
      qb.andWhere('role.is_system_role = :isSystem', { isSystem: filters.isSystemRole });
    }

    qb.orderBy('role.level', 'ASC').addOrderBy('role.name', 'ASC');
    qb.skip(skip).take(take);

    return qb.getManyAndCount();
  }

  /**
   * Create a new role
   */
  async create(data: Partial<RoleEntity>): Promise<RoleEntity> {
    const role = this.repository.create(data);
    return this.repository.save(role);
  }

  /**
   * Update a role
   */
  async update(id: string, data: Partial<RoleEntity>): Promise<RoleEntity> {
    // Use save instead of update to avoid type issues with relations
    const role = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    Object.assign(role, data);
    await this.repository.save(role);

    const updated = await this.findWithPermissions(id);
    if (!updated) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return updated;
  }

  /**
   * Soft delete a role
   */
  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
