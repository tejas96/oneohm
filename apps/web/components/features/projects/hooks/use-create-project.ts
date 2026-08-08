'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProjectPriority, TaskStatusConfig } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { projectKeys } from './use-projects';

import { propertyKeys } from '@/components/features/properties/hooks';
import { quoteKeys } from '@/components/features/quotes';
import { apiClient } from '@/lib/api/client';

export interface ConvertFromQuotePayload {
  name?: string;
  description?: string;
  projectManagerId?: string;
  teamMembers?: Array<{ userId: string; roleName: string; isProjectManager?: boolean }>;
  startDate?: string;
  endDate?: string;
  priority?: ProjectPriority;
  excludedStepIds?: string[];
  taskAssignments?: Array<{ workflowStepId: string; assignedToUserId: string }>;
  taskMilestoneOverrides?: Array<{
    workflowStepId: string;
    milestoneName: string | null;
    milestoneOrder: number | null;
  }>;
  milestones?: Array<{ name: string; order: number }>;
  taskStatuses?: TaskStatusConfig[];
}

interface ProjectResponse {
  id: string;
  projectNumber: string;
  name: string;
  [key: string]: unknown;
}

export function useConvertFromQuote() {
  const queryClient = useQueryClient();

  return useMutation<
    ProjectResponse,
    AxiosError,
    { quoteId: string; payload: ConvertFromQuotePayload }
  >({
    mutationFn: async ({ quoteId, payload }) => {
      const { data } = await apiClient.post<ProjectResponse>(
        `/projects/convert-from-quote/${quoteId}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all() });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
    },
  });
}
