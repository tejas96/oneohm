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

/**
 * Whose dashboard is being read.
 *
 * Admins qualify by role; everyone else needs `dashboard.employees.view`. A
 * caller with neither gets their OWN id back and the `userId` they sent is
 * ignored — the same silent pin-to-self `resolveProjectListMemberId` applies to
 * the project list. There is deliberately no 403: the parameter is not an
 * authorization token, so an unauthorised caller is answered, not refused.
 *
 * Reading roles as well as permissions is load-bearing, not defensive. `admin`
 * and `super_admin` hold ZERO rows in `role_permissions` — they bypass rather
 * than hold grants — so `permissions.includes(...)` alone is false for every
 * admin and would lock out exactly the people this feature is for.
 *
 * `permissions` MUST be a fresh list from `IamService.getUserPermissions`, not
 * `CurrentUserType.permissions`. The latter is baked into the JWT at login, and
 * the web app gates the selector on the fresh list `/auth/me` returns — passing
 * the token's copy here lets the two disagree for the whole life of an access
 * token after a grant, so the dropdown appears and the parameter is ignored.
 *
 * The code string is duplicated from `apps/web/lib/rbac/catalog.ts` on purpose:
 * the backend does not import from the web app, and the migration is already
 * the backend's copy of the catalog.
 */
export function resolveDashboardSubjectId(
  roles: string[],
  permissions: string[],
  currentUserId: string,
  options: { userId?: string } = {},
): string {
  const canViewOthers =
    hasAdminBypassRole(roles) || permissions.includes('dashboard.employees.view');
  return canViewOthers && options.userId ? options.userId : currentUserId;
}
