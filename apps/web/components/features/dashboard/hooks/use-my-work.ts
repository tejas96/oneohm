'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { MyWorkResponse } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { dashboardKeys } from './dashboard-keys';

import { apiClient } from '@/lib/api/client';

/**
 * The whole dashboard, in one request.
 *
 * Deliberately not five calls: this is the first screen after login, and five
 * round trips is five chances to show a half-drawn page. The backend already
 * degrades one section at a time, so a single request loses nothing.
 *
 * No `staleTime` override — the provider default of 60s is right here. A stale
 * "needs attention" list is worse than a slow one, and we do not cache further.
 */
export function useMyWork(): UseQueryResult<MyWorkResponse, AxiosError> {
  return useQuery({
    queryKey: dashboardKeys.myWork(),
    queryFn: async () => {
      const { data } = await apiClient.get<MyWorkResponse>('/dashboard/my-work');
      return data;
    },
  });
}
