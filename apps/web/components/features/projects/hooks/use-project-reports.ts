'use client';

import { DocumentEntityType, DocumentTag } from '@oneohm-epc/shared/types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { REPORT_REGISTRY } from '../components/project-detail/reports/registry/report-registry';
import type { ReportTemplate } from '../components/project-detail/reports/types/report.types';

import { getDocuments, type DocumentRecord } from '@/lib/api/documents';
import { useAuth } from '@/providers/auth-provider';

const REPORT_TAGS: DocumentTag[] = [
  DocumentTag.WCR,
  DocumentTag.DCR,
  DocumentTag.ANNEXURE_PROFORMA_A,
  DocumentTag.NET_METERING_AGREEMENT,
];

const GENERATED_REPORTS_LIMIT = 20;

export interface ProjectReportsData {
  generated: DocumentRecord[];
  available: ReportTemplate[];
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
      const generated = docs
        .filter((doc) => reportTagSet.has(doc.tag as DocumentTag))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, GENERATED_REPORTS_LIMIT);

      const generatedTags = new Set(generated.map((doc) => doc.tag as DocumentTag));
      const available = REPORT_REGISTRY.filter(
        (template) => !generatedTags.has(template.documentTag),
      );

      return { generated, available };
    },
    enabled: !!projectId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}
