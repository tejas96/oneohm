import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { RolePermissionEntity } from '../entities/role-permission.entity';

@Injectable()
export class RolePermissionRepository {
  constructor(
    @InjectRepository(RolePermissionEntity)
    public readonly repository: Repository<RolePermissionEntity>,
  ) {}

  /**
   * Assign permissions to role
   */
  async assignPermissions(
    roleId: string,
    permissionIds: string[],
    createdBy: string,
  ): Promise<RolePermissionEntity[]> {
    const rolePermissions = permissionIds.map((permissionId) =>
      this.repository.create({
        roleId,
        permissionId,
        createdBy,
      }),
    );

    return this.repository.save(rolePermissions);
  }

  /**
   * Remove permissions from role
   */
  async removePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.repository.delete({
      roleId,
      permissionId: In(permissionIds),
    });
  }

  /**
   * Remove all permissions from role
   */
  async removeAllPermissions(roleId: string): Promise<void> {
    await this.repository.delete({ roleId });
  }

  /**
   * Get all permissions for a role
   */
  async findByRoleId(roleId: string): Promise<RolePermissionEntity[]> {
    return this.repository.find({
      where: { roleId },
      relations: ['permission'],
    });
  }

  /**
   * Get all roles with a specific permission
   */
  async findByPermissionId(permissionId: string): Promise<RolePermissionEntity[]> {
    return this.repository.find({
      where: { permissionId },
      relations: ['role'],
    });
  }

  /**
   * Check if role has permission
   */
  async hasPermission(roleId: string, permissionId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { roleId, permissionId },
    });
    return count > 0;
  }

  /**
   * Check if role has any of the permissions
   */
  async hasAnyPermission(roleId: string, permissionIds: string[]): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        roleId,
        permissionId: In(permissionIds),
      },
    });
    return count > 0;
  }

  /**
   * Sync permissions for a role (replace all)
   */
  async syncPermissions(
    roleId: string,
    permissionIds: string[],
    createdBy: string,
  ): Promise<RolePermissionEntity[]> {
    // Remove all existing permissions
    await this.removeAllPermissions(roleId);

    // Add new permissions
    return this.assignPermissions(roleId, permissionIds, createdBy);
  }
}
