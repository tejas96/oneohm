'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ReportWorkspace } from '@tejas96/shared/reports';
import type { AxiosError } from 'axios';

import { showToast } from '@/components/ui';
import { getReportsPending, getReportWorkspace, updateReportFacts } from '@/lib/api/reports';

export const projectReportKeys = {
  all: () => ['project-reports'] as const,
  byProject: (projectId: string) => [...projectReportKeys.all(), projectId] as const,
  pending: (projectIds: string[]) =>
    [...projectReportKeys.all(), 'pending', [...projectIds].sort().join(',')] as const,
};

export function useProjectReports(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ReportWorkspace, AxiosError> {
  return useQuery({
    queryKey: projectReportKeys.byProject(projectId),
    queryFn: () => getReportWorkspace(projectId),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useUpdateReportFacts(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (facts: Record<string, string | null>) => updateReportFacts(projectId, facts),
    onSuccess: (workspace) => {
      queryClient.setQueryData(projectReportKeys.byProject(projectId), workspace);
      void queryClient.invalidateQueries({ queryKey: [...projectReportKeys.all(), 'pending'] });
    },
    onError: (err: AxiosError<{ message?: string }>) =>
      showToast.error(err.response?.data?.message ?? 'Could not save. Try again.'),
  });
}

export function useReportsPending(projectIds: string[]): UseQueryResult<Record<string, number>> {
  return useQuery({
    queryKey: projectReportKeys.pending(projectIds),
    queryFn: () => getReportsPending(projectIds),
    enabled: projectIds.length > 0,
    staleTime: 60_000,
  });
}
