import type { DocumentCategory, DocumentEntityType } from '@oneohm-epc/shared/types';

import { apiClient } from './client';

export interface DocumentUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DocumentRecord {
  id: string;
  organizationId: string;
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
  organizationId?: string;
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

function orgHeader(orgId?: string): Record<string, string> {
  return orgId ? { 'X-Organization-Id': orgId } : {};
}

export async function getDocuments(params: {
  propertyId?: string;
  entityType?: DocumentEntityType;
  entityId?: string;
  entityIds?: string;
  category?: string;
  tag?: string;
  tags?: string;
  organizationId?: string;
}): Promise<DocumentRecord[]> {
  const { organizationId, ...queryParams } = params;
  const { data } = await apiClient.get<DocumentRecord[]>('/documents', {
    params: queryParams,
    headers: orgHeader(organizationId),
  });
  return data;
}

export async function createDocument(
  payload: CreateDocumentPayload,
  organizationId?: string,
): Promise<DocumentRecord> {
  const { data } = await apiClient.post<DocumentRecord>('/documents', payload, {
    headers: orgHeader(organizationId),
  });
  return data;
}

export async function createDocumentsBulk(
  documents: CreateDocumentPayload[],
  organizationId?: string,
): Promise<DocumentRecord[]> {
  const { data } = await apiClient.post<DocumentRecord[]>(
    '/documents/bulk',
    { documents },
    {
      headers: orgHeader(organizationId),
    },
  );
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
  organizationId?: string,
): Promise<DocumentRecord> {
  const { data } = await apiClient.patch<DocumentRecord>(`/documents/${id}`, payload, {
    headers: orgHeader(organizationId),
  });
  return data;
}

export async function deleteDocument(
  id: string,
  organizationId?: string,
  options?: { permanent?: boolean },
): Promise<void> {
  await apiClient.delete(`/documents/${id}`, {
    headers: orgHeader(organizationId),
    params: options?.permanent ? { permanent: 'true' } : undefined,
  });
}

export async function getDocumentDownloadUrl(id: string, organizationId?: string): Promise<string> {
  const { data } = await apiClient.get<{ url: string }>(`/documents/${id}/download`, {
    headers: orgHeader(organizationId),
  });
  return data.url;
}
