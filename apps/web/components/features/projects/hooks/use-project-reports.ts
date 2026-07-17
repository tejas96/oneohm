'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { DocumentRecord } from '@/lib/api/documents';
import { getReportCompleteness, type ReportCompletenessItem } from '@/lib/api/reports';
import { useAuth } from '@/providers/auth-provider';

export interface ProjectReportsData {
  saved: DocumentRecord[];
  savedCount: number;
  totalCount: number;
  pendingCount: number;
  reports: ReportCompletenessItem[];
}

export const projectReportKeys = {
  all: (orgId?: string) => ['project-reports', orgId] as const,
  byProject: (orgId: string | undefined, projectId: string) =>
    [...projectReportKeys.all(orgId), projectId] as const,
};

export function useProjectReports(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectReportsData, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: projectReportKeys.byProject(organizationId, projectId),
    queryFn: async (): Promise<ProjectReportsData> => {
      const summary = await getReportCompleteness(projectId, organizationId);

      return {
        saved: summary.saved,
        savedCount: summary.savedReports,
        totalCount: summary.totalReports,
        pendingCount: summary.pendingCount,
        reports: summary.reports,
      };
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
