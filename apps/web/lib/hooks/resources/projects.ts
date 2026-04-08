'use client';

import { useQuery } from '@tanstack/react-query';

import { createResourceKeys, defineResource, STALE_TIMES, useOrgContext } from '../core';

import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────

export interface ActivityFeedItem {
  taskId: string;
  taskCode: string;
  taskName: string;
  activityType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
}

export interface TeamWorkloadEntry {
  userId: string;
  userName: string;
  tasksByStatus: Record<string, number>;
  totalTasks: number;
  completedTasks: number;
  workloadPercent: number;
}

export interface MilestoneProgressEntry {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  percent: number;
}

export interface UpcomingDeadline {
  id: string;
  name: string;
  endDate: string;
}

export interface ProjectSummaryMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  unassignedTasks: number;
  completionPercentage: number;
  upcomingDeadlines: UpcomingDeadline[];
}

export interface ProjectSummary {
  metrics: ProjectSummaryMetrics;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  recentActivity: ActivityFeedItem[];
  teamWorkload: TeamWorkloadEntry[];
  milestoneProgress: MilestoneProgressEntry[];
}

// ── Resource Registration ──────────────────────────────────────
// FDAL entry point for the projects entity.
// Existing feature hooks remain in their feature folder until migrated.

defineResource(
  'projects',
  { endpoint: '/projects', defaultPageSize: 20, syncToUrl: true },
  {
    view: 'projects:read',
    create: 'projects:create',
    update: 'projects:update',
    delete: 'projects:delete',
  },
);

// ── Summary Hook ───────────────────────────────────────────────
// Follows the useLookupsByTypeCode pattern: direct useQuery + FDAL primitives.
// useResourceStats is not used — it lacks an `enabled` option to gate
// the query when the tab is inactive.

const summaryKeys = createResourceKeys('project-summary');

export function useProjectSummary(
  projectId: string,
  options?: { enabled?: boolean },
): {
  data: ProjectSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const { orgHeaders, isReady } = useOrgContext();

  const query = useQuery<ProjectSummary>({
    queryKey: summaryKeys.detail(undefined, projectId),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ProjectSummary>(
        `/projects/${projectId}/analytics/summary`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
    enabled: !!projectId && isReady && options?.enabled !== false,
    staleTime: STALE_TIMES.fast,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
