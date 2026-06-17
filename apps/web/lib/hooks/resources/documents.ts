'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';

import { createResourceKeys, useOrgContext } from '../core';

import {
  getDocuments,
  createDocument,
  createDocumentsBulk,
  deleteDocument,
  updateDocument,
  type CreateDocumentPayload,
  type DocumentRecord,
} from '@/lib/api/documents';
import { deleteFile } from '@/lib/api/storage';
import { extractFileKey } from '@/lib/utils';

// ── Query Keys (FDAL-compliant with orgId) ─────────────────────

const documentKeys = createResourceKeys('documents');

// ── Query Hooks ────────────────────────────────────────────────

export function useDocumentsByEntity(
  entityType: DocumentEntityType,
  entityId: string | undefined,
): UseQueryResult<DocumentRecord[]> {
  const { organizationId, isReady } = useOrgContext();

  return useQuery({
    queryKey: [...documentKeys.all(organizationId), entityType, entityId ?? ''],
    queryFn: (): Promise<DocumentRecord[]> =>
      getDocuments({ entityType, entityId: entityId!, organizationId }),
    enabled: !!entityId && isReady,
  });
}

export function useDocumentsByProperty(
  propertyId: string | undefined,
): UseQueryResult<DocumentRecord[]> {
  const { organizationId, isReady } = useOrgContext();

  return useQuery({
    queryKey: [...documentKeys.all(organizationId), 'property', propertyId ?? ''],
    queryFn: (): Promise<DocumentRecord[]> =>
      getDocuments({ propertyId: propertyId!, organizationId }),
    enabled: !!propertyId && isReady,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useDocumentsByEntityBatch(
  entityType: DocumentEntityType,
  entityIds: string[],
): UseQueryResult<DocumentRecord[]> {
  const { organizationId, isReady } = useOrgContext();

  return useQuery({
    queryKey: [...documentKeys.all(organizationId), entityType, 'batch', ...entityIds],
    queryFn: (): Promise<DocumentRecord[]> =>
      getDocuments({ entityType, entityIds: entityIds.join(','), organizationId }),
    enabled: entityIds.length > 0 && isReady,
  });
}

// ── Mutation Hooks ─────────────────────────────────────────────

export function useUploadDocument(): UseMutationResult<
  DocumentRecord,
  unknown,
  CreateDocumentPayload
> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: (payload: CreateDocumentPayload): Promise<DocumentRecord> =>
      createDocument(payload, organizationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all(organizationId) });
    },
  });
}

export function useUploadDocumentsBulk(): UseMutationResult<
  DocumentRecord[],
  unknown,
  CreateDocumentPayload[]
> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: (documents: CreateDocumentPayload[]): Promise<DocumentRecord[]> =>
      createDocumentsBulk(documents, organizationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all(organizationId) });
    },
  });
}

interface UpdateDocumentPayload {
  id: string;
  tag?: string;
  notes?: string;
  category?: DocumentCategory;
  entityType?: DocumentEntityType;
  metadata?: Record<string, unknown>;
}

export function useUpdateDocument(): UseMutationResult<
  DocumentRecord,
  unknown,
  UpdateDocumentPayload
> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateDocumentPayload): Promise<DocumentRecord> =>
      updateDocument(id, payload, organizationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all(organizationId) });
    },
  });
}

export interface DeleteDocumentInput {
  id: string;
  fileUrl: string;
}

export function useDeleteDocument(): UseMutationResult<void, unknown, DeleteDocumentInput> {
  const queryClient = useQueryClient();
  const { organizationId } = useOrgContext();

  return useMutation({
    mutationFn: async ({ id, fileUrl }: DeleteDocumentInput): Promise<void> => {
      const fileKey = extractFileKey(fileUrl);
      if (fileKey) {
        try {
          await deleteFile(fileKey);
        } catch {
          // Storage delete is non-blocking — file may already be gone or key invalid
        }
      }
      await deleteDocument(id, organizationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all(organizationId) });
    },
  });
}
