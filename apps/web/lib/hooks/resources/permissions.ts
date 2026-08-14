'use client';

import {
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  useResourceList,
  useResourcePermissions,
  type ResourceConfig,
  type BaseFilters,
} from '../core';

// ── Types ──────────────────────────────────────────────────────

export interface AdminPermission {
  id: string;
  name: string;
  code: string;
  /** User-facing sentence, shown in the access dialog. */
  description?: string;
  /** Groups the checkbox list in the role builder. */
  module: string;
  isActive: boolean;
  rolesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  /** User-facing sentence, shown in the access dialog. */
  description?: string;
  /** Groups the checkbox list in the role builder. */
  module: string;
}

export interface PermissionFilters extends BaseFilters {
  module?: string;
}

// ── Resource Registration ──────────────────────────────────────

defineResource<AdminPermission>(
  'permissions',
  {
    endpoint: '/iam/permissions',
    defaultPageSize: 10,
    syncToUrl: true,
    paramMapping: { limit: 'pageSize' },
  },
  // No permission codes. Admin screens are gated as a whole by
  // SUPERADMIN_ONLY in route-map.ts, so a per-resource code would
  // gate nothing extra.
);

// ── Hooks ──────────────────────────────────────────────────────

export function usePermissions(): ReturnType<
  typeof useResourceList<AdminPermission, PermissionFilters>
> {
  const config = getResourceConfig('permissions') as ResourceConfig<
    AdminPermission,
    PermissionFilters
  >;
  return useResourceList<AdminPermission, PermissionFilters>(config);
}

export function useAllPermissions(): ReturnType<typeof useResourceList<AdminPermission>> {
  return useResourceList<AdminPermission>({
    resource: 'permissions',
    endpoint: '/iam/permissions',
    defaultPageSize: 500,
    syncToUrl: false,
    paramMapping: { limit: 'pageSize' },
  });
}

export function usePermissionPermissions(): ReturnType<typeof useResourcePermissions> {
  return useResourcePermissions(getResourcePermissions('permissions'));
}
