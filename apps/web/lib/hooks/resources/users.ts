'use client';

import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';

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
import { createResourceKeys } from '../core/query-keys';

import { apiClient } from '@/lib/api/client';

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

export interface AdminUserListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  roleId?: string;
  showDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  fromDate?: string;
  toDate?: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
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

export function useAdminUsers(): ReturnType<typeof useResourceList<AdminUser, AdminUserFilters>> {
  const config = getResourceConfig('users') as ResourceConfig<AdminUser, AdminUserFilters>;
  return useResourceList<AdminUser, AdminUserFilters>(config);
}

export function useAdminUser(
  userId: string,
  options?: { enabled?: boolean },
): ReturnType<typeof useResourceDetail<AdminUser>> {
  return useResourceDetail<AdminUser>({
    resource: 'users',
    endpoint: '/users',
    id: userId,
    enabled: options?.enabled,
  });
}

export function useAdminUserMutations(): ReturnType<typeof useResourceMutations<AdminUser>> {
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

export function useAdminUserPermissions(): ReturnType<typeof useResourcePermissions> {
  return useResourcePermissions(getResourcePermissions('users'));
}

/**
 * Caller-owned filter hook for use with AdvancedTable + useTableUrlState.
 * Unlike `useAdminUsers()` (which manages its own internal state via useResourceList),
 * this hook accepts external filters and only returns data.
 * Query keys are aligned with the 'users' resource so mutations invalidate this cache.
 */
export function useAdminUsersList(
  filters: AdminUserListFilters,
): UseQueryResult<AdminUserListResponse, AxiosError> {
  const keys = useMemo(() => createResourceKeys('users'), []);

  return useQuery({
    queryKey: keys.list(filters as unknown as Record<string, unknown>),
    queryFn: async (): Promise<AdminUserListResponse> => {
      const params = new URLSearchParams();
      if (filters.page != null) params.append('page', String(filters.page));
      if (filters.limit != null) params.append('limit', String(filters.limit));
      if (filters.search && filters.search.length >= 2) {
        params.append('search', filters.search);
      }
      if (filters.status) params.append('status', filters.status);
      if (filters.roleId) params.append('roleId', filters.roleId);
      if (filters.showDeleted) params.append('showDeleted', 'true');
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      const { data } = await apiClient.get(`/users?${params.toString()}`, {
      });
      return data as AdminUserListResponse;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCheckUserAvailability(
  excludeId?: string,
): ReturnType<typeof useFieldAvailability> & {
  checkPhone: (phone: string) => void;
  checkEmail: (email: string) => void;
  phoneInfo: string | null;
  clearPhoneInfo: () => void;
  setContextPhone: (phone: string) => void;
} {
  const [phoneInfo, setPhoneInfo] = useState<string | null>(null);
  const [contextPhone, setContextPhoneState] = useState<string | undefined>(undefined);

  const extraParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (contextPhone) params.phone = contextPhone;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [contextPhone]);

  const fieldConfig = useMemo(
    () => ({
      endpoint: '/users/check-availability',
      excludeIdParam: 'excludeId',
      extraParams,
      validateResponse: (field: string, data: unknown) => {
        const res = data as {
          emailExists?: boolean;
          phoneExists?: boolean;
          employeeExists?: boolean;
          emailBelongsToPhoneUser?: boolean;
        };

        if (field === 'email') {
          if (res.emailExists && res.emailBelongsToPhoneUser) return null;
          if (res.emailExists) return 'This email is already registered';
        }

        if (field === 'phone') {
          if (res.phoneExists && res.employeeExists) {
            setPhoneInfo(null);
            return 'This employee already exists in your organization';
          }
          if (res.phoneExists && !res.employeeExists) {
            setPhoneInfo('User found. They will be linked as an employee.');
            return null;
          }
          setPhoneInfo(null);
        }

        return null;
      },
    }),
    [extraParams],
  );

  const availability = useFieldAvailability(fieldConfig, excludeId);

  const { checkField } = availability;

  const checkPhone = useCallback(
    (phone: string) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        setPhoneInfo(null);
        return;
      }
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

  const setContextPhone = useCallback((phone: string) => {
    const digits = phone.replace(/\D/g, '');
    setContextPhoneState(digits.length === 10 ? `+91${digits}` : undefined);
  }, []);

  const clearPhoneInfo = useCallback(() => setPhoneInfo(null), []);

  return { ...availability, checkPhone, checkEmail, phoneInfo, clearPhoneInfo, setContextPhone };
}
