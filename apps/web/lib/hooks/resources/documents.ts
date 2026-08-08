'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';

import { createResourceKeys } from '../core';

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

export { documentKeys };

// ── Query Hooks ────────────────────────────────────────────────

export function useDocumentsByEntity(
  entityType: DocumentEntityType,
  entityId: string | undefined,
): UseQueryResult<DocumentRecord[]> {
  return useQuery({
    queryKey: [...documentKeys.all(), entityType, entityId ?? ''],
    queryFn: (): Promise<DocumentRecord[]> => getDocuments({ entityType, entityId: entityId! }),
    enabled: !!entityId,
  });
}

export function useDocumentsByProperty(
  propertyId: string | undefined,
): UseQueryResult<DocumentRecord[]> {
  return useQuery({
    queryKey: [...documentKeys.all(), 'property', propertyId ?? ''],
    queryFn: (): Promise<DocumentRecord[]> => getDocuments({ propertyId: propertyId! }),
    enabled: !!propertyId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useDocumentsByEntityBatch(
  entityType: DocumentEntityType,
  entityIds: string[],
): UseQueryResult<DocumentRecord[]> {
  return useQuery({
    queryKey: [...documentKeys.all(), entityType, 'batch', ...entityIds],
    queryFn: (): Promise<DocumentRecord[]> =>
      getDocuments({ entityType, entityIds: entityIds.join(',') }),
    enabled: entityIds.length > 0,
  });
}

// ── Mutation Hooks ─────────────────────────────────────────────

export function useUploadDocument(): UseMutationResult<
  DocumentRecord,
  unknown,
  CreateDocumentPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDocumentPayload): Promise<DocumentRecord> =>
      createDocument(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all() });
    },
  });
}

export function useUploadDocumentsBulk(): UseMutationResult<
  DocumentRecord[],
  unknown,
  CreateDocumentPayload[]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documents: CreateDocumentPayload[]): Promise<DocumentRecord[]> =>
      createDocumentsBulk(documents),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all() });
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

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateDocumentPayload): Promise<DocumentRecord> =>
      updateDocument(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all() });
    },
  });
}

export interface DeleteDocumentInput {
  id: string;
  fileUrl: string;
}

export function useDeleteDocument(): UseMutationResult<void, unknown, DeleteDocumentInput> {
  const queryClient = useQueryClient();

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
      await deleteDocument(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all() });
    },
  });
}
