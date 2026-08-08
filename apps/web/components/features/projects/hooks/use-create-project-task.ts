'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { type TaskPriority, type TaskStatus } from '@tejas96/shared/types';

import { PROJECT_TASKS_QUERY_KEY } from '../constants';
import { projectDetailKeys } from './use-project-detail';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';

export interface CreateProjectTaskPayload {
  name: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string | null;
  milestoneName?: string | null;
  startDate?: string;
  endDate?: string;
}

export function useCreateProjectTask(
  projectId: string,
): UseMutationResult<void, unknown, CreateProjectTaskPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProjectTaskPayload) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      await apiClient.post(`/projects/${projectId}/tasks`, payload);
    },
    onSuccess: () => {
      showToast.success('Task created');
      void queryClient.invalidateQueries({ queryKey: PROJECT_TASKS_QUERY_KEY() });
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.taskStats(projectId),
      });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });
}
