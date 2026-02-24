'use client';

import type { ProjectPriority } from '@oneohm-epc/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { projectKeys } from './use-projects';

import { propertyKeys } from '@/components/features/properties/hooks';
import { quoteKeys } from '@/components/features/quotes';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

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
  taskMilestoneOverrides?: Array<{ workflowStepId: string; milestoneOrder: number }>;
  milestones?: Array<{ name: string; type: string; order: number }>;
}

interface ProjectResponse {
  id: string;
  projectNumber: string;
  name: string;
  [key: string]: unknown;
}

export function useConvertFromQuote() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
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
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all(organizationId) });
    },
  });
}
