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

/**
 * Org-wide project *visibility*. Admins always qualify; everyone else needs
 * `projects.view`. This is a read grant — it must not be used to skip team
 * membership on mutating routes (tasks, team, materials, chat post).
 *
 * Used wherever we used to treat "not admin" as "only projects I am assigned
 * to". That hid converted installations from staff who were allowed to see
 * projects but were not on the crew.
 */
export function canViewAllProjects(roles: string[], permissions: string[] = []): boolean {
  return hasAdminBypassRole(roles) || permissions.includes('projects.view');
}

/**
 * Who the project list is pinned to.
 *
 * - Admins / `projects.view`: org-wide. An explicit `memberId` still filters.
 * - `service.manage` + `customerId`: that customer's projects, so a ticket can
 *   be raised without `projects.view` and without being on the crew.
 * - Everyone else: always the current user (personal work queue). A bare
 *   `customerId` query param is not enough to skip that pin.
 */
export function resolveProjectListMemberId(
  roles: string[],
  permissions: string[],
  currentUserId: string,
  options: { customerId?: string; memberId?: string } = {},
): string | undefined {
  const viewAll = canViewAllProjects(roles, permissions);
  const serviceCustomerLookup =
    Boolean(options.customerId) && permissions.includes('service.manage');

  if (viewAll || serviceCustomerLookup) {
    return options.memberId;
  }

  return currentUserId;
}
