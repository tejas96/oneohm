'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AttentionItem } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export const projectAttentionKeys = {
  all: (orgId?: string) => ['project-attention', orgId] as const,
  byProject: (orgId: string | undefined, projectId: string) =>
    [...projectAttentionKeys.all(orgId), projectId] as const,
};

export function useProjectAttention(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<AttentionItem[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: projectAttentionKeys.byProject(organizationId, projectId),
    queryFn: async (): Promise<AttentionItem[]> => {
      const { data } = await apiClient.get<AttentionItem[]>(`/projects/${projectId}/attention`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
