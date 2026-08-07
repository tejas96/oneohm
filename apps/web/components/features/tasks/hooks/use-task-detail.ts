'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { MyTask } from '@tejas96/shared/types';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export const taskDetailKeys = {
  all: () => ['task-detail'] as const,
  detail: (taskId: string) =>
    [...taskDetailKeys.all(), taskId] as const,
};

export function useTaskDetail(taskId: string | null): UseQueryResult<MyTask> {
  const { user } = useAuth();

  return useQuery({
    queryKey: taskDetailKeys.detail(taskId ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<MyTask>(`/tasks/${taskId}`, {
      });
      return data;
    },
    enabled: !!user && !!taskId,
    refetchOnWindowFocus: true,
  });
}
