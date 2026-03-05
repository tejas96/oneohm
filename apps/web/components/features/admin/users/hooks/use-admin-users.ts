'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

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

interface AdminUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export const adminUserKeys = {
  base: ['admin-users'] as const,
  all: (orgId?: string) => [...adminUserKeys.base, orgId] as const,
  lists: (orgId?: string) => [...adminUserKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...adminUserKeys.lists(orgId), filters] as const,
  details: (orgId?: string) => [...adminUserKeys.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...adminUserKeys.details(orgId), id] as const,
};

export type UserSortField = 'firstName' | 'lastName' | 'createdAt' | 'lastLoginAt' | 'status';
export type SortOrder = 'ASC' | 'DESC';

interface UseAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  roleId?: string;
  showDeleted?: boolean;
  sortBy?: UserSortField;
  sortOrder?: SortOrder;
}

export function useAdminUsers(params: UseAdminUsersParams = {}) {
  const { page = 1, limit = 10, search, status, roleId, showDeleted, sortBy, sortOrder } = params;
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery<AdminUsersResponse>({
    queryKey: adminUserKeys.list(orgId, {
      page,
      limit,
      search,
      status,
      roleId,
      showDeleted,
      sortBy,
      sortOrder,
    }),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('limit', String(limit));
      if (search) queryParams.set('search', search);
      if (status && status !== 'all') queryParams.set('status', status);
      if (roleId) queryParams.set('roleId', roleId);
      if (sortBy) queryParams.set('sortBy', sortBy);
      if (sortOrder) queryParams.set('sortOrder', sortOrder);
      if (orgId) queryParams.set('organizationId', orgId);
      if (showDeleted) queryParams.set('showDeleted', 'true');

      const { data } = await apiClient.get<AdminUsersResponse>(`/users?${queryParams.toString()}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
