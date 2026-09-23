'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getFact, type ReportWorkspace } from '@tejas96/shared/reports';
import type { AxiosError } from 'axios';

import { projectKeys } from './use-projects';

import { customerKeys } from '@/components/features/customers/hooks/use-create-customer';
import { propertyKeys } from '@/components/features/properties/hooks/property-keys';
import { getReportsPending, getReportWorkspace, updateReportFacts } from '@/lib/api/reports';

export const projectReportKeys = {
  all: () => ['project-reports'] as const,
  byProject: (projectId: string) => [...projectReportKeys.all(), projectId] as const,
  pending: (projectIds: string[]) =>
    [...projectReportKeys.all(), 'pending', [...projectIds].sort().join(',')] as const,
  saveFacts: (projectId: string) => [...projectReportKeys.all(), 'save-facts', projectId] as const,
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

/**
 * One save path for every field on the Reports tab. The caller shows a failed
 * save's message under its field, so there is no toast here. A customer or
 * site fact also refreshes the screens that show that record: the customer,
 * the site and the project header (customer name and phone).
 */
export function useUpdateReportFacts(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    ReportWorkspace,
    AxiosError<{ message?: string }>,
    Record<string, string | null>
  >({
    mutationKey: projectReportKeys.saveFacts(projectId),
    mutationFn: (facts) => updateReportFacts(projectId, facts),
    onSuccess: (workspace, facts) => {
      queryClient.setQueryData(projectReportKeys.byProject(projectId), workspace);
      void queryClient.invalidateQueries({ queryKey: [...projectReportKeys.all(), 'pending'] });

      if (!Object.keys(facts).some((key) => getFact(key)?.edit)) return;
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(workspace.customerId) });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.detail(workspace.propertyId) });
      void queryClient.invalidateQueries({
        queryKey: propertyKeys.byCustomer(workspace.customerId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId), exact: true });
    },
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
