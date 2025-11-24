import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { FeatureRepository } from '../repositories/feature.repository';
import { PermissionRepository } from '../repositories/permission.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { RoleRepository } from '../repositories/role.repository';

/**
 * IAM Service - Minimal Implementation
 * Core service for Identity and Access Management
 * Handles permission checking and role management
 *
 * Simplified to 4 core tables:
 * - features: Application features/modules
 * - permissions: Granular permissions
 * - roles: Dynamic roles (org-specific)
 * - role_permissions: Many-to-many mapping
 */
@Injectable()
export class IamService {
  private readonly logger = new Logger(IamService.name);

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly featureRepository: FeatureRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  /**
   * Check if user has a specific permission
   * @param userId - User ID
   * @param permissionCode - Permission code (e.g., 'customers:read')
   * @param scope - Optional scope ('own', 'department', etc.)
   * @param resourceId - Optional resource ID for ownership checks
   * @param resourceOwnerId - Optional owner ID of the resource for 'own' scope
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
    scope?: string,
    resourceId?: string,
    resourceOwnerId?: string,
  ): Promise<boolean> {
    // 1. Get user's roles
    const userRoles = await this.userRoleRepository.findByUserId(userId);
    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    // 2. Get permission by code
    const permission = await this.permissionRepository.findByCode(permissionCode);
    if (!permission?.isActive) {
      return false;
    }

    // 3. Check if any of user's roles have this permission
    for (const userRole of userRoles) {
      // Handle both old enum-based roles and new role_id
      const roleId = userRole.roleId; // From new IAM system

      if (!roleId) {
        // TODO: Handle backward compatibility with enum-based roles
        continue;
      }

      const hasRolePermission = await this.rolePermissionRepository.hasPermission(
        roleId,
        permission.id,
      );

      if (!hasRolePermission) {
        continue;
      }

      // 4. Check scope if provided
      if (scope && permission.scope !== 'all') {
        if (scope === 'own' && resourceOwnerId) {
          // Check if user owns the resource
          if (userId !== resourceOwnerId) {
            continue; // User doesn't own this resource
          }
        }
        // TODO: Implement other scopes (department, assigned, custom)
      }

      // Permission granted!
      return true;
    }

    return false;
  }

  /**
   * Get all permissions for a user (across all their roles)
   * @param userId - User ID
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
   * Check if user has access to a feature (simplified)
   * In minimal IAM: Feature access = having ANY permission for that feature
   * @param userId - User ID
   * @param featureCode - Feature code (e.g., 'customers')
   */
  async hasFeatureAccess(userId: string, featureCode: string): Promise<boolean> {
    // 1. Get feature
    const feature = await this.featureRepository.findByCode(featureCode);
    if (!feature?.isActive) {
      return false;
    }

    // 2. Get all feature permissions
    const featurePermissions = await this.permissionRepository.findByFeatureId(feature.id);
    if (!featurePermissions || featurePermissions.length === 0) {
      return false;
    }

    // 3. Check if user has ANY permission for this feature
    for (const permission of featurePermissions) {
      const hasPermission = await this.hasPermission(userId, permission.code);
      if (hasPermission) {
        return true;
      }
    }

    return false;
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
    // Verify role exists
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Assign permissions
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
    // Verify role exists
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Sync permissions
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
