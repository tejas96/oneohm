import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentUserType } from '../../auth/types';
import { hasAdminBypassRole } from '../constants';
import {
  PERMISSION_KEY,
  type PermissionMetadata,
} from '../decorators/require-permission.decorator';

/**
 * Permission Guard - JWT-Based (Fast & Stateless)
 * Checks permissions directly from JWT payload (no DB lookup)
 *
 * Access is granted if EITHER condition is met:
 * 1. User has an admin-level role (platform_admin, super_admin, admin) — bypass
 * 2. User has the specific required permission in their JWT
 *
 * Usage:
 * @RequirePermission('customers:read')
 * @RequirePermission('customers:read:own')
 * @RequirePermission('customers:create')
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissionMetadata = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: CurrentUserType }>();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Access denied: User not authenticated');
    }

    const userRoles: string[] = user.roles ?? [];
    if (hasAdminBypassRole(userRoles)) {
      return true;
    }

    const { permissionCode, scope } = permissionMetadata;
    const userPermissions: string[] = user.permissions ?? [];

    let requiredPermission = permissionCode;
    if (scope) {
      requiredPermission = `${permissionCode}:${scope}`;
    }

    const hasPermission: boolean = userPermissions.includes(requiredPermission);

    if (!hasPermission && scope === 'own') {
      const allPermission = `${permissionCode}:all`;
      if (userPermissions.includes(allPermission)) {
        return true;
      }
    }

    if (!hasPermission) {
      this.logger.warn(
        `Access denied for user ${user.id}: missing '${requiredPermission}' (roles: ${userRoles.join(', ')})`,
      );
      throw new ForbiddenException(`Access denied: Missing permission '${requiredPermission}'`);
    }

    return true;
  }
}
