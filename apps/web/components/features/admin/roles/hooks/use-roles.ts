'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

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

interface RolesResponse {
  data: AdminRole[];
  total: number;
  page: number;
  pageSize: number;
}

export const roleKeys = {
  base: ['admin-roles'] as const,
  all: (orgId?: string) => [...roleKeys.base, orgId] as const,
  lists: (orgId?: string) => [...roleKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...roleKeys.lists(orgId), filters] as const,
  details: (orgId?: string) => [...roleKeys.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...roleKeys.details(orgId), id] as const,
};

interface UseRolesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isSystemRole?: boolean;
  organizationId?: string;
}

export function useRoles(params: UseRolesParams = {}) {
  const { page = 1, pageSize = 10, search, isSystemRole, organizationId } = params;
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery<RolesResponse>({
    queryKey: roleKeys.list(orgId, { page, pageSize, search, isSystemRole, organizationId }),
    queryFn: async () => {
      const qp = new URLSearchParams();
      qp.set('page', String(page));
      qp.set('pageSize', String(pageSize));
      if (search) qp.set('search', search);
      if (isSystemRole !== undefined) qp.set('isSystemRole', String(isSystemRole));
      if (organizationId) qp.set('organizationId', organizationId);

      const { data } = await apiClient.get<RolesResponse>(`/iam/roles?${qp.toString()}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
