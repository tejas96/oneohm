'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { ProjectDocument } from './types';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';


// ============================================================================
// Query Keys
// ============================================================================

export const documentKeys = {
  all: (orgId?: string) => ['documents', orgId] as const,
  byProject: (orgId: string | undefined, projectId: string) =>
    [...documentKeys.all(orgId), 'project', projectId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useProjectDocuments(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectDocument[], AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: documentKeys.byProject(organizationId, projectId),
    queryFn: async (): Promise<ProjectDocument[]> => {
      const { data } = await apiClient.get<ProjectDocument[]>(
        `/documents?projectId=${projectId}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!projectId && !!organizationId && (options?.enabled !== false),
    staleTime: 30_000,
  });
}
