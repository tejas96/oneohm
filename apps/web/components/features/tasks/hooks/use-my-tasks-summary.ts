'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

interface MyTasksSummaryResponse {
  total: number;
  overdue: number;
  dueToday: number;
  completedThisWeek: number;
}

export const myTasksSummaryKeys = {
  all: () => ['my-tasks-summary'] as const,
};

/**
 * Lightweight hook that fetches only summary counts (no task data).
 * Used for navigation badge rendering without loading the full task list.
 */
export function useMyTasksSummary(): UseQueryResult<MyTasksSummaryResponse> {
  const { user } = useAuth();

  return useQuery({
    queryKey: myTasksSummaryKeys.all(),
    queryFn: async () => {
      const { data } = await apiClient.get<MyTasksSummaryResponse>('/tasks/my/summary', {});
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
}
