import { DocumentEntityType } from '@tejas96/shared/types';

import apiClient from './client';
import type { DocumentRecord } from './documents';

function orgHeader(orgId?: string): Record<string, string> {
  return orgId ? { 'X-Organization-Id': orgId } : {};
}

export interface ReportContextPayload {
  entityType: DocumentEntityType;
  entityId: string;
}

export interface ReportInitializeResponse {
  fields: Record<string, string>;
  html: string;
  savedDocumentId?: string;
}

export interface ReportPreviewResponse {
  html: string;
}

export interface ReportSaveFilePayload {
  fileKey: string;
  publicUrl: string;
  fileSizeBytes: number;
}

export interface ReportSaveResponse {
  documentId: string;
  downloadUrl: string;
}

export interface ReportCatalogItem {
  id: string;
  name: string;
  description: string;
  documentTag: string;
}

export async function listReports(): Promise<ReportCatalogItem[]> {
  const { data } = await apiClient.get<ReportCatalogItem[]>('/reports');
  return data;
}

export async function initializeReport(
  payload: {
    reportId: string;
    context: ReportContextPayload;
    ignoreSavedDraft?: boolean;
  },
  organizationId?: string,
): Promise<ReportInitializeResponse> {
  const { data } = await apiClient.post<ReportInitializeResponse>('/reports/initialize', payload, {
    headers: orgHeader(organizationId),
  });
  return data;
}

export async function previewReport(
  payload: {
    reportId: string;
    context: ReportContextPayload;
    fields: Record<string, string>;
  },
  organizationId?: string,
  signal?: AbortSignal,
): Promise<ReportPreviewResponse> {
  const { data } = await apiClient.post<ReportPreviewResponse>('/reports/preview', payload, {
    headers: orgHeader(organizationId),
    signal,
  });
  return data;
}

export async function saveReport(
  payload: {
    reportId: string;
    context: ReportContextPayload;
    fields: Record<string, string>;
    file: ReportSaveFilePayload;
  },
  organizationId?: string,
): Promise<ReportSaveResponse> {
  const { data } = await apiClient.post<ReportSaveResponse>('/reports/save', payload, {
    timeout: 60_000,
    headers: orgHeader(organizationId),
  });
  return data;
}

export interface ReportCompletenessField {
  key: string;
  label: string;
}

export interface ReportCompletenessItem {
  reportId: string;
  reportName: string;
  totalRequired: number;
  filledRequired: number;
  missingRequired: number;
  missingFields: ReportCompletenessField[];
  isComplete: boolean;
  isSaved: boolean;
  savedDocumentId?: string;
}

export interface ReportsPendingSummary {
  totalReports: number;
  savedReports: number;
  incompleteReports: number;
  unsavedReports: number;
  pendingCount: number;
  reports: ReportCompletenessItem[];
  saved: DocumentRecord[];
}

export async function getReportCompleteness(
  projectId: string,
  organizationId?: string,
): Promise<ReportsPendingSummary> {
  const { data } = await apiClient.get<ReportsPendingSummary>('/reports/completeness', {
    params: { projectId },
    headers: orgHeader(organizationId),
  });
  return data;
}
