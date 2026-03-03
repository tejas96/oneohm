import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { RoleEntity } from '../entities/role.entity';

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
    organizationId: string | null,
  ): Promise<RoleEntity | null> {
    // For platform roles, organization_id IS NULL
    if (organizationId === null || organizationId === '') {
      return this.repository.findOne({
        where: { code, organizationId: IsNull(), deletedAt: IsNull() },
        relations: ['parent', 'rolePermissions', 'rolePermissions.permission'],
      });
    }

    return this.repository.findOne({
      where: { code, organizationId, deletedAt: IsNull() },
      relations: ['parent', 'rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Find platform-level role by code (organization_id IS NULL)
   */
  async findPlatformRoleByCode(code: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { code, organizationId: IsNull(), deletedAt: IsNull() },
      relations: ['parent', 'rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Find all roles for an organization
   */
  async findByOrganization(
    organizationId: string,
    skip?: number,
    take?: number,
  ): Promise<[RoleEntity[], number]> {
    return this.repository.findAndCount({
      where: { organizationId, deletedAt: IsNull() },
      order: { level: 'ASC', name: 'ASC' },
      skip,
      take,
    });
  }

  /**
   * Find system roles for an organization
   */
  async findSystemRoles(organizationId: string): Promise<RoleEntity[]> {
    return this.repository.find({
      where: { organizationId, isSystemRole: true, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
  }

  /**
   * Find child roles
   */
  async findChildren(parentRoleId: string): Promise<RoleEntity[]> {
    return this.repository.find({
      where: { parentRoleId, deletedAt: IsNull() },
      order: { level: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Get role hierarchy (role with all children)
   */
  async getRoleHierarchy(roleId: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { id: roleId, deletedAt: IsNull() },
      relations: ['children', 'parent'],
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
    organizationId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('role')
      .where('role.code = :code', { code })
      .andWhere('role.organization_id = :organizationId', { organizationId })
      .andWhere('role.deleted_at IS NULL');

    if (excludeId) {
      query.andWhere('role.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Get all roles with hierarchy
   */
  async findAllWithHierarchy(organizationId: string): Promise<RoleEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['parent', 'children'],
      order: { level: 'ASC', name: 'ASC' },
    });
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
      throw new Error(`Role with ID ${id} not found`);
    }
    Object.assign(role, data);
    await this.repository.save(role);

    const updated = await this.findWithPermissions(id);
    if (!updated) {
      throw new Error(`Role with ID ${id} not found`);
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
