'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUserKeys } from './use-admin-users';

import { apiClient } from '@/lib/api/client';

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { userId: string; roleId: string; organizationId?: string }) => {
      const response = await apiClient.post('/iam/user-roles', data);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.base });
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: string; userId: string }) => {
      await apiClient.delete(`/iam/user-roles/${assignmentId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.base });
    },
  });
}
