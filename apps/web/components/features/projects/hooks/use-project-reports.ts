'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getFact, type ReportWorkspace } from '@tejas96/shared/reports';
import type { AxiosError } from 'axios';
import { useRef } from 'react';

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
 * site fact also refreshes the screens that show that record: customers,
 * sites and the project header (customer name and phone).
 *
 * Saves can overlap (blur one field, then another before the first replies).
 * Each reply is a whole workspace, and an older one landing last would put a
 * just-saved field back to its old value. So a reply is written to the cache
 * only when no other save was in flight; otherwise the workspace is refetched
 * once each overlapping save settles.
 */
export function useUpdateReportFacts(projectId: string) {
  const queryClient = useQueryClient();
  const inFlight = useRef(0);
  const overlapped = useRef(false);

  return useMutation<
    ReportWorkspace,
    AxiosError<{ message?: string }>,
    Record<string, string | null>
  >({
    mutationKey: projectReportKeys.saveFacts(projectId),
    mutationFn: (facts) => updateReportFacts(projectId, facts),
    onMutate: () => {
      if (inFlight.current > 0) overlapped.current = true;
      inFlight.current += 1;
    },
    onSuccess: (workspace, facts) => {
      if (!overlapped.current) {
        queryClient.setQueryData(projectReportKeys.byProject(projectId), workspace);
      }
      void queryClient.invalidateQueries({ queryKey: [...projectReportKeys.all(), 'pending'] });

      if (!Object.keys(facts).some((key) => getFact(key)?.edit)) return;
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(workspace.customerId) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId), exact: true });
    },
    onSettled: () => {
      inFlight.current -= 1;
      if (!overlapped.current) return;
      void queryClient.invalidateQueries({ queryKey: projectReportKeys.byProject(projectId) });
      if (inFlight.current === 0) overlapped.current = false;
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
