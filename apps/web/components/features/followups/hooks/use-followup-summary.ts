'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { followupKeys } from './followup-keys';

import { apiClient } from '@/lib/api/client';

export interface FollowupSummary {
  overdue: number;
  today: number;
  upcoming: number;
  gaps: number;
}

/**
 * Badge and tab counts.
 *
 * Deliberately NOT routed through `lib/hooks/use-navigation-counts.ts` — that
 * hook returns hardcoded mock numbers behind a "TODO: Replace with actual API
 * call" and is wired to no endpoint, so borrowing it would render an invented
 * count next to real data.
 */
export function useFollowupSummary(mine = true): UseQueryResult<FollowupSummary, AxiosError> {
  return useQuery({
    queryKey: followupKeys.summary(mine),
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await apiClient.get<FollowupSummary>(`/followups/summary?mine=${mine}`);
      return data;
    },
  });
}
