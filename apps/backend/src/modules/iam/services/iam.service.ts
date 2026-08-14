import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { In, IsNull } from 'typeorm';

import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { RoleRepository } from '../repositories/role.repository';

@Injectable()
export class IamService {
  private readonly logger = new Logger(IamService.name);

  // PermissionRepository is no longer injected — nothing here reads the
  // catalog directly since `hasPermission` was removed.
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  // `hasPermission` used to live here for PermissionGuard. Both are gone:
  // enforcement is frontend-only now, so the backend's only job is to report
  // what a user holds. `getUserPermissions` below fills the JWT and /auth/me.

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

    // Roles are soft-deleted, and `user_roles` rows are not cascaded when that
    // happens. Without this filter a link left pointing at a deleted role would
    // keep granting its permissions — a deleted role must grant nothing.
    const roleIds = userRoles.map((ur) => ur.roleId).filter((id): id is string => Boolean(id));
    const liveRoleIds = new Set(
      (
        await this.roleRepository.repository.find({
          where: { id: In(roleIds), deletedAt: IsNull() },
          select: { id: true },
        })
      ).map((role) => role.id),
    );

    const permissionCodes = new Set<string>();

    for (const userRole of userRoles) {
      const roleId = userRole.roleId;

      if (!roleId) {
        this.logger.warn(`Skipping user role without role_id for user ${userId}`);
        continue;
      }

      if (!liveRoleIds.has(roleId)) {
        this.logger.debug(`Skipping deleted role ${roleId} for user ${userId}`);
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

  // `hasAnyPermission` and `hasAllPermissions` went with `hasPermission` —
  // they existed only to serve PermissionGuard. The web app answers these
  // questions now, from the permission list it already holds.
}
