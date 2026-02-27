import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { PermissionRepository } from '../repositories/permission.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { RoleRepository } from '../repositories/role.repository';

@Injectable()
export class IamService {
  private readonly logger = new Logger(IamService.name);

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
    scope?: string,
    resourceId?: string,
    resourceOwnerId?: string,
  ): Promise<boolean> {
    const userRoles = await this.userRoleRepository.findByUserId(userId);
    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    const permission = await this.permissionRepository.findByCode(permissionCode);
    if (!permission?.isActive) {
      return false;
    }

    for (const userRole of userRoles) {
      const roleId = userRole.roleId;

      if (!roleId) {
        continue;
      }

      const hasRolePermission = await this.rolePermissionRepository.hasPermission(
        roleId,
        permission.id,
      );

      if (!hasRolePermission) {
        continue;
      }

      if (scope && permission.scope !== 'all') {
        if (scope === 'own' && resourceOwnerId) {
          if (userId !== resourceOwnerId) {
            continue;
          }
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Get all permissions for a user (union across all their roles)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    this.logger.debug(`Getting permissions for user: ${userId}`);

    const userRoles = await this.userRoleRepository.findByUserId(userId);
    this.logger.debug(`Found ${userRoles?.length || 0} user roles for user ${userId}`);

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    const permissionCodes = new Set<string>();

    for (const userRole of userRoles) {
      const roleId = userRole.roleId;

      if (!roleId) {
        this.logger.warn(`Skipping user role without role_id for user ${userId}`);
        continue;
      }

      const rolePermissions = await this.rolePermissionRepository.findByRoleId(roleId);
      this.logger.debug(`Found ${rolePermissions?.length || 0} permissions for role ${roleId}`);

      for (const rp of rolePermissions) {
        if (rp.permission?.isActive) {
          permissionCodes.add(rp.permission.code);
        }
      }
    }

    const permissions = Array.from(permissionCodes);
    this.logger.debug(`Total permissions for user ${userId}: ${permissions.length}`);
    return permissions;
  }

  /**
   * Get user's role IDs
   */
  async getUserRoleIds(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepository.findByUserId(userId);
    return userRoles
      .map((ur) => ur.roleId)
      .filter((id): id is string => id !== null && id !== undefined);
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[],
    createdBy: string,
  ): Promise<void> {
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    await this.rolePermissionRepository.assignPermissions(roleId, permissionIds, createdBy);
  }

  /**
   * Sync permissions for a role (replace all existing)
   */
  async syncRolePermissions(
    roleId: string,
    permissionIds: string[],
    createdBy: string,
  ): Promise<void> {
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    await this.rolePermissionRepository.syncPermissions(roleId, permissionIds, createdBy);
  }

  /**
   * Check if user has ANY of the provided permissions
   */
  async hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
    for (const code of permissionCodes) {
      const hasPermission = await this.hasPermission(userId, code);
      if (hasPermission) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has ALL of the provided permissions
   */
  async hasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
    for (const code of permissionCodes) {
      const hasPermission = await this.hasPermission(userId, code);
      if (!hasPermission) {
        return false;
      }
    }
    return true;
  }
}
