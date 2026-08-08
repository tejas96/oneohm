'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AttentionItem } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

export const projectAttentionKeys = {
  all: () => ['project-attention'] as const,
  byProject: (projectId: string) => [...projectAttentionKeys.all(), projectId] as const,
};

export function useProjectAttention(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<AttentionItem[], AxiosError> {
  return useQuery({
    queryKey: projectAttentionKeys.byProject(projectId),
    queryFn: async (): Promise<AttentionItem[]> => {
      const { data } = await apiClient.get<AttentionItem[]>(`/projects/${projectId}/attention`, {});
      return data;
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
