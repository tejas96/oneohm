'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { ProjectDetail, ProjectTeamMember, TaskStatsSummary } from './types';
import { projectKeys } from './use-projects';

import { apiClient } from '@/lib/api/client';
import type { ProjectTaskItem } from '@/lib/hooks/resources';

// ============================================================================
// Query Keys
// ============================================================================

export const projectDetailKeys = {
  ...projectKeys,
  team: (id: string) =>
    [...projectKeys.detail(id), 'team'] as const,
  taskStats: (id: string) =>
    [...projectKeys.detail(id), 'taskStats'] as const,
  tasks: (id: string) =>
    [...projectKeys.detail(id), 'tasks'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useProject(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectDetail, AxiosError> {

  return useQuery({
    queryKey: projectDetailKeys.detail(projectId),
    queryFn: async (): Promise<ProjectDetail> => {
      const { data } = await apiClient.get<ProjectDetail>(`/projects/${projectId}`, {
      });
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectTeam(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectTeamMember[], AxiosError> {

  return useQuery({
    queryKey: projectDetailKeys.team(projectId),
    queryFn: async (): Promise<ProjectTeamMember[]> => {
      const { data } = await apiClient.get<ProjectTeamMember[]>(`/projects/${projectId}/team`, {
      });
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectTaskStats(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<TaskStatsSummary, AxiosError> {

  return useQuery({
    queryKey: projectDetailKeys.taskStats(projectId),
    queryFn: async (): Promise<TaskStatsSummary> => {
      const { data } = await apiClient.get<TaskStatsSummary>(
        `/projects/${projectId}/tasks/stats/summary`,
      );
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectTasks(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectTaskItem[], AxiosError> {

  return useQuery({
    queryKey: projectDetailKeys.tasks(projectId),
    queryFn: async (): Promise<ProjectTaskItem[]> => {
      const { data } = await apiClient.get<{ data: ProjectTaskItem[] }>(
        `/projects/${projectId}/tasks?limit=100`,
      );
      return data.data ?? [];
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
