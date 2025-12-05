import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentUserType } from '../../auth/types';
import { ROLES_KEY } from '../decorators/require-role.decorator';

/**
 * Role Guard - JWT-Based
 * Checks if user has any of the required roles
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RoleGuard)
 * @RequireRole('platform_admin')
 * async create() { ... }
 *
 * @UseGuards(JwtAuthGuard, RoleGuard)
 * @RequireRole('platform_admin', 'super_admin')  // User needs ANY of these
 * async findAll() { ... }
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<{ user: CurrentUserType }>();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Access denied: User not authenticated');
    }

    // Get user's roles from JWT payload
    const userRoles: string[] = user.roles ?? [];

    // Check if user has ANY of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
