'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { roleKeys } from './use-roles';

import { apiClient } from '@/lib/api/client';

export function useSyncRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      const response = await apiClient.post(`/iam/roles/${roleId}/permissions/sync`, {
        permissionIds,
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleKeys.base });
    },
  });
}
