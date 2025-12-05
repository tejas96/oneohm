import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Require Role Decorator
 * Restricts endpoint access to users with specific roles
 *
 * @param roles - Array of role codes (e.g., 'platform_admin', 'super_admin')
 *
 * @example
 * // Single role
 * @RequireRole('platform_admin')
 * @Post()
 * async create() { ... }
 *
 * @example
 * // Multiple roles (OR logic - user needs ANY of these)
 * @RequireRole('platform_admin', 'super_admin')
 * @Get()
 * async findAll() { ... }
 */
export const RequireRole = (...roles: string[]): MethodDecorator & ClassDecorator => {
  return SetMetadata(ROLES_KEY, roles);
};
