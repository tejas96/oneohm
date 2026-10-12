'use client';

import { queryOptions, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AttentionItem } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

const projectAttentionKeys = {
  all: () => ['project-attention'] as const,
  byProject: (projectId: string) => [...projectAttentionKeys.all(), projectId] as const,
};

/**
 * The query itself, for a caller that needs it for several projects at once
 * (`useQueries`) and must share the cache with `useProjectAttention`.
 */
export function projectAttentionQuery(projectId: string) {
  return queryOptions<AttentionItem[], AxiosError>({
    queryKey: projectAttentionKeys.byProject(projectId),
    queryFn: async (): Promise<AttentionItem[]> => {
      const { data } = await apiClient.get<AttentionItem[]>(`/projects/${projectId}/attention`, {});
      return data;
    },
    staleTime: 30_000,
  });
}

export function useProjectAttention(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<AttentionItem[], AxiosError> {
  return useQuery({
    ...projectAttentionQuery(projectId),
    enabled: !!projectId && options?.enabled !== false,
  });
}
