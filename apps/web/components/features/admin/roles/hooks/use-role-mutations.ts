'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { roleKeys } from './use-roles';

import { apiClient } from '@/lib/api/client';

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await apiClient.post('/iam/roles', data);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleKeys.base });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, data }: { roleId: string; data: Record<string, unknown> }) => {
      const response = await apiClient.patch(`/iam/roles/${roleId}`, data);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleKeys.base });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      await apiClient.delete(`/iam/roles/${roleId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roleKeys.base });
    },
  });
}
