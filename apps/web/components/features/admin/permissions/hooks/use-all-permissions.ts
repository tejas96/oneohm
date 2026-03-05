'use client';

import { useQuery } from '@tanstack/react-query';

import { permissionKeys } from './use-permissions';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

interface Permission {
  id: string;
  name: string;
  code: string;
  action: string;
  scope: string;
}

interface PermissionsListResponse {
  data: Permission[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAllPermissions() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery<Permission[]>({
    queryKey: [...permissionKeys.all(orgId), 'all-flat'],
    queryFn: async () => {
      const { data } = await apiClient.get<PermissionsListResponse>(
        '/iam/permissions?pageSize=500',
      );
      return data.data;
    },
  });
}

export type { Permission };
