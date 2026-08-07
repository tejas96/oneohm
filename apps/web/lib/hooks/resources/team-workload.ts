'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { createResourceKeys } from '../core';

import type { TeamWorkloadItem } from '@/components/features/projects/hooks/use-team-workload';
import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────

export type { TeamWorkloadItem };

// ── Query Keys ─────────────────────────────────────────────────

const wlKeys = createResourceKeys('team-workload');

// ── Hooks ──────────────────────────────────────────────────────

/**
 * Fetch team workload for the current org.
 * Endpoint returns flat TeamWorkloadItem[] (not paginated).
 * Endpoint: GET /projects/team/workload
 */
export function useTeamWorkload(): UseQueryResult<TeamWorkloadItem[]> {

  return useQuery<TeamWorkloadItem[]>({
    queryKey: wlKeys.list({}),
    queryFn: async (): Promise<TeamWorkloadItem[]> => {
      const { data } = await apiClient.get<TeamWorkloadItem[]>('/projects/team/workload');
      return data as TeamWorkloadItem[];
    },
  });
}
