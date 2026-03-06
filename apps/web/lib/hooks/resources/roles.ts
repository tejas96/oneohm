'use client';

import {
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  useResourceList,
  useResourceDetail,
  useResourceMutations,
  useResourcePermissions,
  type ResourceConfig,
  type BaseFilters,
} from '../core';

// ── Types ──────────────────────────────────────────────────────

export interface AdminRole {
  id: string;
  organizationId: string | null;
  name: string;
  code: string;
  description?: string;
  parentRoleId?: string;
  level: number;
  isSystemRole: boolean;
  permissionsCount?: number;
  usersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleWithPermissions {
  id: string;
  organizationId: string | null;
  name: string;
  code: string;
  description?: string;
  parentRoleId?: string;
  level: number;
  isSystemRole: boolean;
  permissions: string[];
  permissionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleFilters extends BaseFilters {
  isSystemRole?: boolean;
  organizationId?: string;
}

// ── Resource Registration ──────────────────────────────────────

defineResource<AdminRole>(
  'roles',
  {
    endpoint: '/iam/roles',
    defaultPageSize: 10,
    syncToUrl: true,
    defaultSort: { field: 'createdAt', order: 'DESC' },
    paramMapping: { limit: 'pageSize' },
  },
  {
    view: 'roles:read',
    create: 'roles:create',
    update: 'roles:update',
    delete: 'roles:delete',
  },
);

// ── Hooks ──────────────────────────────────────────────────────

export function useRoles(overrides?: Partial<ResourceConfig<AdminRole, RoleFilters>>) {
  const config = getResourceConfig('roles') as ResourceConfig<AdminRole, RoleFilters>;
  return useResourceList<AdminRole, RoleFilters>({ ...config, ...overrides });
}

export function useRole(roleId: string) {
  return useResourceDetail<RoleWithPermissions>({
    resource: 'roles',
    endpoint: '/iam/roles',
    id: roleId,
  });
}

export function useRoleMutations() {
  return useResourceMutations<AdminRole>({
    resource: 'roles',
    endpoint: '/iam/roles',
    customActions: {
      syncPermissions: {
        method: 'POST',
        path: (id) => `/iam/roles/${id}/permissions/sync`,
      },
    },
    invalidateRelated: ['permissions'],
    toast: {
      create: { success: 'Role created successfully', error: 'Failed to create role' },
      update: { success: 'Role updated successfully', error: 'Failed to update role' },
      delete: { success: 'Role deleted successfully', error: 'Failed to delete role' },
      syncPermissions: {
        success: 'Permissions synced successfully',
        error: 'Failed to sync permissions',
      },
    },
  });
}

export function useRolePermissions() {
  return useResourcePermissions(getResourcePermissions('roles'));
}
