'use client';

import { useQuery } from '@tanstack/react-query';

import { roleKeys } from './use-roles';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

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

export function useRole(roleId: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery<RoleWithPermissions>({
    queryKey: roleKeys.detail(orgId, roleId),
    queryFn: async () => {
      const { data } = await apiClient.get<RoleWithPermissions>(`/iam/roles/${roleId}`);
      return data;
    },
    enabled: !!roleId,
  });
}
