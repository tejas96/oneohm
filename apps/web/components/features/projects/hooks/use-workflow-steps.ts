'use client';

import type { PaginatedResponse, WorkflowStep } from '@oneohm-epc/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export type { WorkflowStep };

export const workflowStepKeys = {
  all: (orgId?: string) => ['workflow-steps', orgId] as const,
  lists: (orgId?: string) => [...workflowStepKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...workflowStepKeys.lists(orgId), filters] as const,
};

export function useWorkflowSteps(
  options?: { isActive?: boolean },
): UseQueryResult<WorkflowStep[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: workflowStepKeys.list(organizationId, { ...options }),
    queryFn: async (): Promise<WorkflowStep[]> => {
      const params = new URLSearchParams();
      if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
      params.append('limit', '200');

      const { data } = await apiClient.get<PaginatedResponse<WorkflowStep>>(
        `/workflow-steps?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data.data;
    },
    enabled: !!organizationId,
  });
}
