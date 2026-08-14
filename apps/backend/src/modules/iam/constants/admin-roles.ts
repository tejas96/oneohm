/**
 * Roles with unrestricted access.
 *
 * Permission enforcement moved to the web app, so this no longer gates
 * endpoints. It survives for business rules that legitimately ask "is this an
 * admin?" — project team membership, and who receives low-stock alerts.
 *
 * `platform_admin` was folded into `super_admin` by migration
 * 1855000000000-ResetRbacCatalog and no longer exists.
 */
export const ADMIN_BYPASS_ROLES = ['super_admin', 'admin'] as const;

export type AdminBypassRole = (typeof ADMIN_BYPASS_ROLES)[number];

export function hasAdminBypassRole(roles: string[]): boolean {
  return ADMIN_BYPASS_ROLES.some((adminRole) => roles.includes(adminRole));
}
