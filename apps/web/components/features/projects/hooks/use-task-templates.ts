'use client';

import type { MilestoneType } from '@oneohm-epc/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface TaskTemplate {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  type?: string;
  defaultDepartment?: string;
  defaultRoleCode?: string;
  defaultMilestoneType?: MilestoneType | null;
  sequenceOrder: number;
  isMandatory: boolean;
  canRunParallel: boolean;
  dependsOnTaskCodes?: string[];
  estimatedDurationHours?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaskTemplateListResponse {
  data: TaskTemplate[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const taskTemplateKeys = {
  all: ['task-templates'] as const,
  lists: () => [...taskTemplateKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...taskTemplateKeys.lists(), filters] as const,
};

export function useTaskTemplates(
  options?: { isActive?: boolean },
): UseQueryResult<TaskTemplate[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: taskTemplateKeys.list({ organizationId, ...options }),
    queryFn: async (): Promise<TaskTemplate[]> => {
      const params = new URLSearchParams();
      if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
      params.append('limit', '200');

      const { data } = await apiClient.get<TaskTemplateListResponse>(
        `/task-templates?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data.data;
    },
    enabled: !!organizationId,
  });
}
