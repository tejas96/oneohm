/**
 * Roles that bypass permission checks and have unrestricted access.
 * Used by PermissionGuard and ProjectTeamGuard for admin-level bypass.
 */
export const ADMIN_BYPASS_ROLES = ['platform_admin', 'super_admin', 'admin'] as const;

export type AdminBypassRole = (typeof ADMIN_BYPASS_ROLES)[number];

export function hasAdminBypassRole(roles: string[]): boolean {
  return ADMIN_BYPASS_ROLES.some((adminRole) => roles.includes(adminRole));
}
