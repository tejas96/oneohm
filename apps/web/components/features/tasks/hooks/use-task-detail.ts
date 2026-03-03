'use client';

import type { MyTask } from '@oneohm-epc/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export const taskDetailKeys = {
  all: (orgId?: string) => ['task-detail', orgId] as const,
  detail: (orgId: string | undefined, taskId: string) =>
    [...taskDetailKeys.all(orgId), taskId] as const,
};

export function useTaskDetail(taskId: string | null): UseQueryResult<MyTask> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: taskDetailKeys.detail(organizationId, taskId ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<MyTask>(`/tasks/${taskId}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!user && !!organizationId && !!taskId,
    refetchOnWindowFocus: true,
  });
}
