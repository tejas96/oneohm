'use client';

import type { ProjectStatus } from '@tejas96/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { projectDetailKeys } from './use-project-detail';
import { projectKeys } from './use-projects';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import { getErrorMessage } from '@/lib/utils/error';

export function useUpdateProjectStatus(projectId: string) {
  const { orgHeaders, organizationId } = useOrgContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: ProjectStatus) => {
      await apiClient.patch(`/projects/${projectId}/status`, { status }, { headers: orgHeaders });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectDetailKeys.detail(organizationId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.lists(organizationId),
      });
      showToast.success('Project status updated successfully');
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });
}
