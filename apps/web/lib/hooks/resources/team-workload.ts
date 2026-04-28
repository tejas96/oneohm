'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { createResourceKeys, useOrgContext } from '../core';

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
  const { orgHeaders, organizationId, isReady } = useOrgContext();

  return useQuery<TeamWorkloadItem[]>({
    queryKey: wlKeys.list(organizationId, {}),
    queryFn: async (): Promise<TeamWorkloadItem[]> => {
      const { data } = await apiClient.get<TeamWorkloadItem[]>('/projects/team/workload', {
        headers: orgHeaders,
      });
      return data as TeamWorkloadItem[];
    },
    enabled: isReady,
  });
}
