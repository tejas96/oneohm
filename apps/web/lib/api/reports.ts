import type { ReportRenderResult, ReportWorkspace } from '@tejas96/shared/reports';

import apiClient from './client';

export interface ReportFileRef {
  fileKey: string;
  publicUrl: string;
  fileSizeBytes: number;
}

export async function getReportWorkspace(projectId: string): Promise<ReportWorkspace> {
  const { data } = await apiClient.get<ReportWorkspace>(`/reports/projects/${projectId}`);
  return data;
}

/** `null` clears a fact. */
export async function updateReportFacts(
  projectId: string,
  facts: Record<string, string | null>,
): Promise<ReportWorkspace> {
  const { data } = await apiClient.patch<ReportWorkspace>(`/reports/projects/${projectId}/facts`, {
    facts,
  });
  return data;
}

export async function renderReport(
  projectId: string,
  reportId: string,
): Promise<ReportRenderResult> {
  const { data } = await apiClient.post<ReportRenderResult>(
    `/reports/projects/${projectId}/render`,
    { reportId },
  );
  return data;
}

export async function fileReport(
  projectId: string,
  reportId: string,
  file: ReportFileRef,
  factsHash: string,
): Promise<{ documentId: string; fileUrl: string }> {
  const { data } = await apiClient.post<{ documentId: string; fileUrl: string }>(
    `/reports/projects/${projectId}/file`,
    { reportId, file, factsHash },
  );
  return data;
}

export async function getReportsPending(projectIds: string[]): Promise<Record<string, number>> {
  const { data } = await apiClient.post<Record<string, number>>('/reports/pending', { projectIds });
  return data;
}
