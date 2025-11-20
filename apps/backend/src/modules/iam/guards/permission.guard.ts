import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CurrentUserType } from '@oneohm-epc/shared-auth';

import {
  PERMISSION_KEY,
  type PermissionMetadata,
} from '../decorators/require-permission.decorator';

/**
 * Permission Guard - JWT-Based (Fast & Stateless)
 * Checks permissions directly from JWT payload (no DB lookup)
 *
 * Replaces the hardcoded RolesGuard with dynamic permission checking
 *
 * Usage:
 * @RequirePermission('customers:read')
 * @RequirePermission('customers:read:own') // For own-scope permissions
 * @RequirePermission('customers:create')
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get permission metadata from decorator
    const permissionMetadata = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission required, allow access
    if (!permissionMetadata) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard, includes permissions)
    const request = context.switchToHttp().getRequest<{ user: CurrentUserType }>();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Access denied: User not authenticated');
    }

    const { permissionCode, scope } = permissionMetadata;

    // JWT-BASED CHECK: Fast O(n) lookup in permissions array
    // Permissions are embedded in JWT during login/refresh
    const userPermissions: string[] = user.permissions ?? [];

    // Check for exact permission match
    // For scope-based permissions, format should be: 'customers:read:own' or 'customers:read:all'
    let requiredPermission = permissionCode;
    if (scope) {
      requiredPermission = `${permissionCode}:${scope}`;
    }

    const hasPermission: boolean = userPermissions.includes(requiredPermission);

    // Fallback: If scoped permission not found, check for 'all' permission
    if (!hasPermission && scope === 'own') {
      const allPermission = `${permissionCode}:all`;
      const hasAllPermission: boolean = userPermissions.includes(allPermission);
      if (hasAllPermission) {
        // User has 'all' scope, which includes 'own'
        return true;
      }
    }

    if (!hasPermission) {
      throw new ForbiddenException(`Access denied: Missing permission '${requiredPermission}'`);
    }

    return true;
  }
}
