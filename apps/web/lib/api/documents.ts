import type { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';

import { apiClient } from './client';

export interface DocumentUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DocumentRecord {
  id: string;
  propertyId: string;
  entityType: DocumentEntityType;
  entityId: string;
  category: DocumentCategory;
  tag: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  uploadedByUser?: DocumentUser;
}

export interface CreateDocumentPayload {
  propertyId?: string;
  entityType: DocumentEntityType;
  entityId: string;
  category: DocumentCategory;
  tag: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
}

export async function getDocuments(params: {
  propertyId?: string;
  entityType?: DocumentEntityType;
  entityId?: string;
  entityIds?: string;
  category?: string;
  tag?: string;
  tags?: string;
}): Promise<DocumentRecord[]> {
  const queryParams = params;
  const { data } = await apiClient.get<DocumentRecord[]>('/documents', {
    params: queryParams,
  });
  return data;
}

export async function createDocument(payload: CreateDocumentPayload): Promise<DocumentRecord> {
  const { data } = await apiClient.post<DocumentRecord>('/documents', payload, {});
  return data;
}

export async function createDocumentsBulk(
  documents: CreateDocumentPayload[],
): Promise<DocumentRecord[]> {
  const { data } = await apiClient.post<DocumentRecord[]>('/documents/bulk', { documents }, {});
  return data;
}

export async function updateDocument(
  id: string,
  payload: {
    tag?: string;
    category?: DocumentCategory;
    entityType?: DocumentEntityType;
    metadata?: Record<string, unknown>;
    notes?: string;
  },
): Promise<DocumentRecord> {
  const { data } = await apiClient.patch<DocumentRecord>(`/documents/${id}`, payload, {});
  return data;
}

export async function deleteDocument(id: string, options?: { permanent?: boolean }): Promise<void> {
  await apiClient.delete(`/documents/${id}`, {
    params: options?.permanent ? { permanent: 'true' } : undefined,
  });
}

export async function getDocumentDownloadUrl(id: string): Promise<string> {
  const { data } = await apiClient.get<{ url: string }>(`/documents/${id}/download`, {});
  return data.url;
}
