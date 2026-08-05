# Fixed Multi-Role Role Surface Audit Allowlist

Milestone A static audit reference (Task 6D). Matches in these categories are expected until Task 7 cutover.

## Canonical access (allowed)

| Pattern | Location | Purpose |
|---------|----------|---------|
| `FixedRoleCode`, `FIXED_ROLES` | `libs/shared/src/constants/fixed-roles.ts` | Role catalog |
| `FeatureAccessKey`, `FEATURE_ROLE_POLICY` | `apps/web/lib/access-control/feature-policy.ts` | Policy matrix |
| `canAccessFeature`, `filterCanonicalRoles` | `apps/web/lib/access-control/access.ts` | Evaluator |
| `getNavigationFeature` | `apps/web/lib/config/navigation-features.ts` | Nav feature map |
| `IMPLEMENTED_ROUTE_POLICIES` | `apps/web/lib/access-control/route-policy.ts` | Route guard manifest |
| `ResourceAccessConfig` | `apps/web/lib/hooks/core/types.ts` | Resource gates |
| `useFeatureAccess`, `useResourceAccess` | `apps/web/lib/hooks/` | Runtime checks |
| `FixedRoleBadges`, `FixedRolePicker` | `apps/web/components/features/admin/users/components/` | Role UX |

## Flag-off legacy IAM (allowed until Task 7)

| Pattern | Location | Removed at cutover |
|---------|----------|-------------------|
| `hasPermission`, `permissions[]` | `auth-provider.tsx`, `auth-store.ts` | Yes |
| `PermissionGuard`, `<Can>` | `apps/web/components/shared/guards/` | Yes |
| `useRoles`, `usePermissions` | `apps/web/lib/hooks/resources/roles.ts`, `permissions.ts` | Yes |
| Admin Roles/Permissions pages | `apps/web/app/(dashboard)/admin/roles`, `permissions` | Yes |
| `AssignRoleModal`, `/iam/user-roles` | admin users components | Yes |
| `NEXT_PUBLIC_FIXED_ROLES_ENABLED` | `config.ts` | Yes (always on) |

## Non-access domain concepts (always allowed)

| Pattern | Meaning |
|---------|---------|
| `profileKind`, `profileType` | Employee vs reseller profile domain |
| `roleName`, `isProjectManager` | Project team local roles |
| `vendorRole` | Inventory vendor business field |
| `role=` (ARIA) | Accessibility attribute |
| `defaultRoleCode` (workflow) | Task default assignee hint; canonical codes only in fixed mode |

## Legacy display-only aliases (never grant fixed-mode access)

`platform_admin`, `superadmin`, `sales_person`, `design_engineer`, `accounts_manager`, `inventory_manager`, `project_manager`, `manager`

Displayed via `getRolePresentation({ isLegacy: true })` when present in user data.

## Audit commands

```bash
rg "hasPermission|hasAnyPermission|PermissionGuard|<Can|useResourcePermissions" apps/web
rg "roleId|roleCode|hasAnyRole|hasRole|useRoles|ORG_ADMIN_ROLES|platform_admin|superadmin" apps/web libs/shared/src
rg "permissions:|users:read|inventory:read|quotes:read|projects:read" apps/web/lib/hooks apps/web/components
```

Post–Milestone A: matches outside this allowlist require review before merge.
