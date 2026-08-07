import { DocumentEntityType } from '@tejas96/shared/types';

import apiClient from './client';
import type { DocumentRecord } from './documents';

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
): Promise<ReportInitializeResponse> {
  const { data } = await apiClient.post<ReportInitializeResponse>('/reports/initialize', payload, {
  });
  return data;
}

export async function previewReport(
  payload: {
    reportId: string;
    context: ReportContextPayload;
    fields: Record<string, string>;
  },
  signal?: AbortSignal,
): Promise<ReportPreviewResponse> {
  const { data } = await apiClient.post<ReportPreviewResponse>('/reports/preview', payload, {
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
): Promise<ReportSaveResponse> {
  const { data } = await apiClient.post<ReportSaveResponse>('/reports/save', payload, {
    timeout: 60_000,
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
): Promise<ReportsPendingSummary> {
  const { data } = await apiClient.get<ReportsPendingSummary>('/reports/completeness', {
    params: { projectId },
  });
  return data;
}
