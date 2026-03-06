'use client';

import { useCallback, useMemo } from 'react';

import {
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  useResourceList,
  useResourceDetail,
  useResourceMutations,
  useResourcePermissions,
  useFieldAvailability,
  type ResourceConfig,
  type BaseFilters,
} from '../core';

// ── Types ──────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  status: string;
  roles: string[];
  profileCompleted: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  lastLoginAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserFilters extends BaseFilters {
  status?: string;
  roleId?: string;
  showDeleted?: boolean;
}

// ── Resource Registration ──────────────────────────────────────

defineResource<AdminUser>(
  'users',
  {
    endpoint: '/users',
    defaultPageSize: 10,
    searchDebounceMs: 550,
    minSearchLength: 2,
    syncToUrl: true,
    defaultSort: { field: 'createdAt', order: 'DESC' },
    defaultFilters: { status: 'all' } as Partial<AdminUserFilters>,
  },
  {
    view: 'users:read',
    create: 'users:create',
    update: 'users:update',
    delete: 'users:delete',
  },
);

// ── Hooks ──────────────────────────────────────────────────────

export function useAdminUsers() {
  const config = getResourceConfig('users') as ResourceConfig<AdminUser, AdminUserFilters>;
  return useResourceList<AdminUser, AdminUserFilters>(config);
}

export function useAdminUser(userId: string) {
  return useResourceDetail<AdminUser>({
    resource: 'users',
    endpoint: '/users',
    id: userId,
  });
}

export function useAdminUserMutations() {
  return useResourceMutations<AdminUser>({
    resource: 'users',
    endpoint: '/users',
    customActions: {
      restore: {
        method: 'POST',
        path: (id) => `/users/${id}/restore`,
      },
    },
    invalidateRelated: ['user-roles'],
    toast: {
      create: { success: 'User created successfully', error: 'Failed to create user' },
      update: { success: 'User updated successfully', error: 'Failed to update user' },
      delete: { success: 'User deleted successfully', error: 'Failed to delete user' },
      statusChange: { success: 'User status updated', error: 'Failed to update status' },
      restore: { success: 'User restored successfully', error: 'Failed to restore user' },
    },
  });
}

export function useAdminUserPermissions() {
  return useResourcePermissions(getResourcePermissions('users'));
}

export function useCheckUserAvailability() {
  const fieldConfig = useMemo(
    () => ({
      endpoint: '/users/check-availability',
      validateResponse: (field: string, data: unknown) => {
        const res = data as { emailExists?: boolean; phoneExists?: boolean };
        if (field === 'email' && res.emailExists) return 'This email is already registered';
        if (field === 'phone' && res.phoneExists) return 'This phone number is already registered';
        return null;
      },
    }),
    [],
  );
  const availability = useFieldAvailability(fieldConfig);

  const { checkField } = availability;

  const checkPhone = useCallback(
    (phone: string) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) return;
      checkField('phone', `+91${digits}`);
    },
    [checkField],
  );

  const checkEmail = useCallback(
    (email: string) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      checkField('email', email);
    },
    [checkField],
  );

  return { ...availability, checkPhone, checkEmail };
}
