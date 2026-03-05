'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

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

interface PermissionsResponse {
  data: AdminPermission[];
  total: number;
  page: number;
  pageSize: number;
}

export const permissionKeys = {
  base: ['admin-permissions'] as const,
  all: (orgId?: string) => [...permissionKeys.base, orgId] as const,
  lists: (orgId?: string) => [...permissionKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...permissionKeys.lists(orgId), filters] as const,
};

interface UsePermissionsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  scope?: string;
}

export function usePermissions(params: UsePermissionsParams = {}) {
  const { page = 1, pageSize = 10, search, action, scope } = params;
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery<PermissionsResponse>({
    queryKey: permissionKeys.list(orgId, { page, pageSize, search, action, scope }),
    queryFn: async () => {
      const qp = new URLSearchParams();
      qp.set('page', String(page));
      qp.set('pageSize', String(pageSize));
      if (search) qp.set('search', search);
      if (action) qp.set('action', action);
      if (scope) qp.set('scope', scope);

      const { data } = await apiClient.get<PermissionsResponse>(
        `/iam/permissions?${qp.toString()}`,
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
