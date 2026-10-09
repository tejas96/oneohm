'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  DashboardFinancing,
  DashboardPeriod,
  ProjectsDashboard,
  StageGroupKey,
  StageProjects,
} from '@tejas96/shared/types';

import { apiClient } from '@/lib/api/client';

export interface DashboardFilters {
  period: DashboardPeriod;
  /** Only with period 'custom'. */
  from?: string;
  to?: string;
  financing: DashboardFinancing;
  /** Quotes dashboard only: deals whose quote this user made. */
  person?: string;
}

export interface StageProjectsParams {
  stage: StageGroupKey | 'none';
  phase?: string;
  financing: DashboardFinancing;
}

export const projectsDashboardKeys = {
  all: ['projects-dashboard'] as const,
  /** Keyed on the request sent (from/to only for a custom period; no person). */
  summary: (query: string) => ['projects-dashboard', 'summary', query] as const,
  stage: (p: StageProjectsParams) => ['projects-dashboard', 'stage', p] as const,
};

/**
 * `keepPreviousData`: a filter change keeps the old numbers on screen and
 * tweens them to the new ones, instead of flashing back to skeletons.
 */
export function useProjectsDashboard(filters: DashboardFilters): UseQueryResult<ProjectsDashboard> {
  const params = new URLSearchParams({ period: filters.period, financing: filters.financing });
  if (filters.period === 'custom' && filters.from && filters.to) {
    params.set('from', filters.from);
    params.set('to', filters.to);
  }
  const query = params.toString();
  return useQuery({
    queryKey: projectsDashboardKeys.summary(query),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ProjectsDashboard>(`/projects/dashboard?${query}`, {
        signal,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/**
 * `enabled` lets a caller keep showing the cached rows while it stops fetching
 * (a closing drawer): no refetch on window focus or remount once it is false.
 */
export function useStageProjects(
  params: StageProjectsParams | null,
  enabled = true,
): UseQueryResult<StageProjects> {
  return useQuery({
    queryKey: params
      ? projectsDashboardKeys.stage(params)
      : [...projectsDashboardKeys.all, 'stage', 'closed'],
    queryFn: async ({ signal }) => {
      const p = params as StageProjectsParams;
      const search = new URLSearchParams({ stage: p.stage, financing: p.financing });
      if (p.phase) search.set('phase', p.phase);
      const { data } = await apiClient.get<StageProjects>(
        `/projects/dashboard/stage-projects?${search}`,
        { signal },
      );
      return data;
    },
    enabled: params !== null && enabled,
    // No keepPreviousData: a stage switch would show the old stage's projects under the new title.
    staleTime: 60_000,
  });
}
