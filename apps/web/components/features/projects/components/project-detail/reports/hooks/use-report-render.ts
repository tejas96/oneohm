'use client';

import { useQuery } from '@tanstack/react-query';

import { renderReport } from '@/lib/api/reports';

/** `stamp` is the workspace's dataUpdatedAt, so a saved fact re-renders the preview. */
export function useReportRender(projectId: string, reportId: string | null, stamp: number) {
  return useQuery({
    queryKey: ['project-reports', projectId, 'render', reportId, stamp],
    queryFn: () => renderReport(projectId, reportId as string),
    enabled: !!reportId,
    staleTime: Infinity,
  });
}
