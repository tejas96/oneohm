'use client';

import { type TaskPriority, type TaskStatus } from '@tejas96/shared/types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { PROJECT_TASKS_QUERY_KEY } from '../constants';
import { projectDetailKeys } from './use-project-detail';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
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
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  return useMutation({
    mutationFn: async (payload: CreateProjectTaskPayload) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      if (!isReady) {
        throw new Error('Organization context is not ready');
      }

      await apiClient.post(`/projects/${projectId}/tasks`, payload, { headers: orgHeaders });
    },
    onSuccess: () => {
      showToast.success('Task created');
      void queryClient.invalidateQueries({ queryKey: PROJECT_TASKS_QUERY_KEY(organizationId) });
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.taskStats(organizationId, projectId),
      });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });
}
