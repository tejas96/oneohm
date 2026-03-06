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
  description?: string;
  action: string;
  scope: string;
  permissionLevel: string;
  showInMenu: boolean;
  menuLabel?: string;
  isActive: boolean;
  isSystemPermission: boolean;
  rolesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  action: string;
  scope: string;
}

export interface PermissionFilters extends BaseFilters {
  action?: string;
  scope?: string;
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
  {
    view: 'permissions:read',
  },
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
