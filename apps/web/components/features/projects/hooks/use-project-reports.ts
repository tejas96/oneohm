'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { DocumentRecord } from '@/lib/api/documents';
import { getReportCompleteness, type ReportCompletenessItem } from '@/lib/api/reports';

export interface ProjectReportsData {
  saved: DocumentRecord[];
  savedCount: number;
  totalCount: number;
  pendingCount: number;
  reports: ReportCompletenessItem[];
}

export const projectReportKeys = {
  all: () => ['project-reports'] as const,
  byProject: (projectId: string) => [...projectReportKeys.all(), projectId] as const,
};

export function useProjectReports(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProjectReportsData, AxiosError> {
  return useQuery({
    queryKey: projectReportKeys.byProject(projectId),
    queryFn: async (): Promise<ProjectReportsData> => {
      const summary = await getReportCompleteness(projectId);

      return {
        saved: summary.saved,
        savedCount: summary.savedReports,
        totalCount: summary.totalReports,
        pendingCount: summary.pendingCount,
        reports: summary.reports,
      };
    },
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
