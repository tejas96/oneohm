'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { REPORT_CATALOG, getReportDocumentTags } from '@tejas96/shared/reports';
import { DocumentEntityType, type DocumentTag } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { getDocuments, type DocumentRecord } from '@/lib/api/documents';
import { useAuth } from '@/providers/auth-provider';

const REPORT_TAGS: DocumentTag[] = getReportDocumentTags();

export interface ProjectReportsData {
  saved: DocumentRecord[];
  savedCount: number;
  totalCount: number;
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
      const docs = await getDocuments({
        entityType: DocumentEntityType.PROJECT,
        entityId: projectId,
        tags: REPORT_TAGS.join(','),
        organizationId,
      });

      const reportTagSet = new Set(REPORT_TAGS);
      const saved = docs.filter((doc) => reportTagSet.has(doc.tag as DocumentTag));

      return {
        saved,
        savedCount: REPORT_CATALOG.filter((schema) =>
          saved.some((doc) => doc.tag === schema.documentTag),
        ).length,
        totalCount: REPORT_CATALOG.length,
      };
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
