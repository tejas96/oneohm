'use client';

import { type TaskStatusConfig } from '@tejas96/shared/types';

import { useProject } from './use-project-detail';

export interface UseProjectTaskStatusesResult {
  taskStatuses: TaskStatusConfig[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Returns the configured task statuses for a project.
 * Task statuses are stored at project creation time and are always populated.
 * Callers must handle isLoading and isError states explicitly.
 */
export function useProjectTaskStatuses(
  projectId: string | undefined,
): UseProjectTaskStatusesResult {
  const { data: project, isLoading, isError, error } = useProject(projectId ?? '');

  return {
    taskStatuses: project?.taskStatuses ?? [],
    isLoading,
    isError,
    error,
  };
}
