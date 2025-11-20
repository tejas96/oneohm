import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface PermissionMetadata {
  permissionCode: string;
  scope?: string;
  resourceIdParam?: string; // Name of the param that contains resource ID
}

/**
 * Require Permission Decorator
 * Replaces @Roles() with dynamic permission checking
 * 
 * @param permissionCode - Permission code (e.g., 'customers:read', 'customers:update')
 * @param options - Optional configuration
 * @param options.scope - Permission scope ('own', 'department', etc.)
 * @param options.resourceIdParam - Request param name containing resource ID
 * 
 * @example
 * // Anyone with customers:read permission
 * @RequirePermission('customers:read')
 * @Get()
 * async findAll() { ... }
 * 
 * @example
 * // Only users who own the resource
 * @RequirePermission('customers:update', { scope: 'own', resourceIdParam: 'id' })
 * @Patch(':id')
 * async update(@Param('id') id: string) { ... }
 * 
 * @example
 * // Admin-only permission
 * @RequirePermission('customers:delete')
 * @Delete(':id')
 * async remove() { ... }
 */
export const RequirePermission = (
  permissionCode: string,
  options?: {
    scope?: string;
    resourceIdParam?: string;
  },
): MethodDecorator & ClassDecorator => {
  const metadata: PermissionMetadata = {
    permissionCode,
    scope: options?.scope,
    resourceIdParam: options?.resourceIdParam,
  };

  return SetMetadata(PERMISSION_KEY, metadata);
};


