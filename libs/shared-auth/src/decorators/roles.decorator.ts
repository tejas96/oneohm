import { SetMetadata } from '@nestjs/common';

import type { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 * Use this to protect routes with specific roles
 * @example @Roles(Role.ADMIN, Role.SUPER_ADMIN)
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
