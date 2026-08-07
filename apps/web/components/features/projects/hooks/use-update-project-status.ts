'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProjectStatus } from '@tejas96/shared/types';

import { projectDetailKeys } from './use-project-detail';
import { projectKeys } from './use-projects';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

export function useUpdateProjectStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: ProjectStatus) => {
      await apiClient.patch(`/projects/${projectId}/status`, { status });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.detail(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
      });
      showToast.success('Project status updated successfully');
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });
}
