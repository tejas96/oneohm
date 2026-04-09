'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { KANBAN_TASKS_LIMIT } from '../constants';
import type { ProjectDetail, ProjectTeamMember, TaskStatsSummary } from './types';
import { projectKeys } from './use-projects';

import { apiClient } from '@/lib/api/client';
import type { ProjectTaskItem } from '@/lib/hooks/resources';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Query Keys
// ============================================================================

export const projectDetailKeys = {
  ...projectKeys,
  team: (orgId: string | undefined, id: string) =>
    [...projectKeys.detail(orgId, id), 'team'] as const,
  taskStats: (orgId: string | undefined, id: string) =>
    [...projectKeys.detail(orgId, id), 'taskStats'] as const,
  tasks: (orgId: string | undefined, id: string) =>
    [...projectKeys.detail(orgId, id), 'tasks'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useProject(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectDetail, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: projectDetailKeys.detail(organizationId, projectId),
    queryFn: async (): Promise<ProjectDetail> => {
      const { data } = await apiClient.get<ProjectDetail>(`/projects/${projectId}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectTeam(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectTeamMember[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: projectDetailKeys.team(organizationId, projectId),
    queryFn: async (): Promise<ProjectTeamMember[]> => {
      const { data } = await apiClient.get<ProjectTeamMember[]>(`/projects/${projectId}/team`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectTaskStats(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<TaskStatsSummary, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: projectDetailKeys.taskStats(organizationId, projectId),
    queryFn: async (): Promise<TaskStatsSummary> => {
      const { data } = await apiClient.get<TaskStatsSummary>(
        `/projects/${projectId}/tasks/stats/summary`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useProjectTasks(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectTaskItem[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: projectDetailKeys.tasks(organizationId, projectId),
    queryFn: async (): Promise<ProjectTaskItem[]> => {
      const { data } = await apiClient.get<{ data: ProjectTaskItem[] }>(
        `/projects/${projectId}/tasks?limit=${KANBAN_TASKS_LIMIT}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data.data ?? [];
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
